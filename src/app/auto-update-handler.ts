import { GenericServerOptions } from 'builder-util-runtime';
import electronLog from 'electron-log';
import { MacUpdater, NsisUpdater } from 'electron-updater';
import * as fs from 'fs';
import { homedir as getHomedir } from 'os';
import * as path from 'path';

import { version } from '../../package.json';
import { isMac, isWindowsOS } from '../common/env';
import { logger } from '../common/logger';
import { isUrl } from '../common/utils';
import { whitelistHandler } from '../common/whitelist-handler';
import { fetchLatestVersion } from './auto-update-utils';
import { sendAutoUpdateAnalytics } from './bi/auto-update-analytics';
import { InstallActionTypes, InstallTypes } from './bi/interface';
import { config, IConfig } from './config-handler';
import { retrieveWindowsRegistry } from './registry-handler';
import { EChannelRegistry, RegistryStore } from './stores/registry-store';
import { windowHandler } from './window-handler';

const DEFAULT_AUTO_UPDATE_CHANNEL = 'apps/sda-update/default';
const VERSION_REGEX = /version: (.*)/;

export enum AutoUpdateTrigger {
  MANUAL = 'MANUAL',
  AUTOMATED = 'AUTOMATED',
}

export enum ChannelConfigLocation {
  LOCALFILE = 'LOCALEFILE',
  ACP = 'ACP',
  REGISTRY = 'REGISTRY',
}
export enum UpdateChannel {
  LATEST = 'latest',
  BETA = 'beta',
}

const DOWNLOAD_PROGRESS_BANNER_DELAY = 1000 * 10; // 10 sec
const AUTO_UPDATE_REASON = 'autoUpdate';
const FORCE_UPDATE_TIMEOUT = 1000 * 10; // 10 sec

export class AutoUpdate {
  public isUpdateAvailable: boolean = false;
  public didPublishDownloadProgress: boolean = false;
  public autoUpdater: MacUpdater | NsisUpdater | undefined = undefined;
  private autoUpdateTrigger: AutoUpdateTrigger | undefined = undefined;
  private finalAutoUpdateChannel: string | undefined = undefined;
  private installVariant: string | undefined = undefined;
  private channelConfigLocation: ChannelConfigLocation =
    ChannelConfigLocation.LOCALFILE;
  private downloadProgressDelayTimer: NodeJS.Timeout | null = null;
  private isForceUpdate: boolean = false;

  public init = async () => {
    const opts = await this.getGenericServerOptions();
    if (isMac) {
      this.autoUpdater = new MacUpdater(opts);
    } else if (isWindowsOS) {
      this.autoUpdater = new NsisUpdater(opts);
    }

    if (this.autoUpdater) {
      this.autoUpdater.logger = electronLog;
      this.autoUpdater.autoDownload = false;
      this.autoUpdater.autoInstallOnAppQuit = true;
      this.autoUpdater.allowDowngrade = true;

      this.autoUpdater.on('update-not-available', () => {
        if (this.autoUpdateTrigger === AutoUpdateTrigger.AUTOMATED) {
          logger.info(
            'auto-update-handler: no update available found with automatic check',
          );
          this.autoUpdateTrigger = undefined;
          return;
        }
        const mainWebContents = windowHandler.mainWebContents;
        // Display client banner
        if (mainWebContents && !mainWebContents.isDestroyed()) {
          mainWebContents.send('display-client-banner', {
            reason: 'autoUpdate',
            action: 'update-not-available',
          });
        }
        this.autoUpdateTrigger = undefined;
      });
      this.autoUpdater.on('update-available', async (info) => {
        await this.updateEventHandler(info, 'update-available');
      });
      this.autoUpdater.on('download-progress', async (info) => {
        await this.updateEventHandler(info, 'download-progress');
      });
      this.autoUpdater.on('update-downloaded', async (info) => {
        if (this.isForceUpdate) {
          this.isForceUpdate = false;
          logger.info(
            'auto-update-handler: update downloaded and isForceUpdate',
          );
          // Handle update and restart
          windowHandler.setIsAutoUpdating(true);
          this.autoUpdater?.quitAndInstall();
          return;
        }
        await this.updateEventHandler(info, 'update-downloaded');
      });

      this.autoUpdater.on('error', (error) => {
        this.autoUpdateTrigger = undefined;
        logger.error(
          'auto-update-handler: Error occurred while updating. ',
          error,
        );
      });
      await this.performForcedAutoUpdate();
    }
  };

  /**
   * Checks for updates and performs a forced installation if the latest version is already downloaded.
   */
  public performForcedAutoUpdate = async () => {
    const cacheDir = this.getCacheDir();
    if (!cacheDir) {
      logger.info(
        'auto-update-handler: cache path does not exists, skipping forced auto-update.',
      );
      return;
    }

    const updaterFilePath = path.join(cacheDir, 'symphony-updater', 'pending');
    if (!fs.existsSync(updaterFilePath)) {
      logger.info(
        'auto-update-handler: Updater directory not found, skipping forced auto-update.',
      );
      return;
    }

    const files = fs.readdirSync(updaterFilePath, 'utf8');
    if (!files.length) {
      logger.info('auto-update-handler: no pending update files found');
      return;
    }

    logger.info('auto-update-handler: pending update files', files);
    const opts = await this.getGenericServerOptions();
    const url = opts.channel ? `${opts.url}/${opts.channel}.yml` : opts.url;
    const latestVersionFromServer = await fetchLatestVersion(
      url,
      FORCE_UPDATE_TIMEOUT,
      VERSION_REGEX,
    );
    if (!latestVersionFromServer) {
      logger.info(
        'auto-update-handler: no version info from server skipping force auto update',
      );
      return;
    }

    const isOnLatestVersion = latestVersionFromServer === version;
    logger.info(
      'auto-update-handler: latest version from server',
      latestVersionFromServer,
    );
    logger.info('auto-update-handler: current version', version);
    if (isOnLatestVersion) {
      logger.info(
        'auto-update-handler: already running the latest version skipping force update',
      );
      return;
    }

    const hasPendingInstaller = files.some(
      (item) =>
        item.includes(latestVersionFromServer) && !item.startsWith('temp'),
    );
    if (hasPendingInstaller) {
      logger.info('auto-update-handler: latest version found force installing');
      this.isForceUpdate = true;
      await this.checkUpdates(AutoUpdateTrigger.AUTOMATED);
      await this.downloadUpdate();
    }
  };

  /**
   * Installs the latest update quits and relaunches application
   */
  public updateAndRestart = async (): Promise<void> => {
    if (!this.isUpdateAvailable) {
      return;
    }
    sendAutoUpdateAnalytics(
      InstallActionTypes.InstallStarted,
      InstallTypes.Auto,
    );
    // Handle update and restart for macOS
    if (isMac) {
      windowHandler.setIsAutoUpdating(true);
    }
    setImmediate(async () => {
      if (this.autoUpdater) {
        await config.updateUserConfig({ startedAfterAutoUpdate: true });
        if (isMac) {
          config.backupGlobalConfig();
        }
        logger.info('auto-update-handler: quitAndInstall');
        this.autoUpdater.quitAndInstall();
      }
    });
  };

  /**
   * Checks for the latest updates
   * @return void
   */
  public checkUpdates = async (
    trigger: AutoUpdateTrigger = AutoUpdateTrigger.MANUAL,
  ): Promise<void> => {
    this.autoUpdateTrigger = trigger;
    logger.info('auto-update-handler: Checking for updates', trigger);
    if (this.autoUpdater) {
      const opts: GenericServerOptions = await this.getGenericServerOptions();
      this.autoUpdater.setFeedURL(opts);
      const updateCheckResult = await this.autoUpdater.checkForUpdates();
      logger.info('auto-update-handler: ', updateCheckResult);
    }
    logger.info('auto-update-handler: After checking auto update');
  };

  /**
   * Downloads the latest update
   * @return void
   */
  public downloadUpdate = async (): Promise<void> => {
    logger.info('auto-update-handler: download update');
    if (this.autoUpdater) {
      this.didPublishDownloadProgress = false;
      await this.autoUpdater.downloadUpdate();
    }
  };

  /**
   * Constructs the SDA auto update end point url
   *
   * @return string
   * @example https://corporate.symphony.com/macos/general
   */
  public getUpdateUrl = (): string => {
    const { url: userConfigURL } = config.getUserConfigFields(['url']);
    const { url: globalConfigURL } = config.getGlobalConfigFields(['url']);
    const { autoUpdateUrl } = config.getConfigFields(['autoUpdateUrl']);

    if (autoUpdateUrl && isUrl(autoUpdateUrl)) {
      logger.info(
        `auto-update-handler: autoUpdateUrl exists so, using it`,
        autoUpdateUrl,
      );
      return autoUpdateUrl;
    }

    const url = userConfigURL ? userConfigURL : globalConfigURL;

    const { subdomain, domain, tld } = whitelistHandler.parseDomain(url);
    const updateUrl = `https://${subdomain}.${domain}${tld}/${DEFAULT_AUTO_UPDATE_CHANNEL}`;
    logger.info(`auto-update-handler: using generic pod url`, updateUrl);

    return updateUrl;
  };

  private getCacheDir = () => {
    const homedir = getHomedir();
    if (isWindowsOS) {
      return process.env.LOCALAPPDATA || path.join(homedir, 'AppData', 'Local');
    } else if (isMac) {
      return path.join(homedir, 'Library', 'Caches');
    }
    return;
  };

  private updateEventHandler = async (info, eventType: string) => {
    logger.info('auto-update-handler: auto update events', info, eventType);
    const mainWebContents = windowHandler.mainWebContents;
    if (mainWebContents && !mainWebContents.isDestroyed()) {
      await this.setAutoUpdateChannel();
      const eventData = {
        reason: AUTO_UPDATE_REASON,
        action: eventType,
        data: {
          ...info,
          autoUpdateTrigger: this.autoUpdateTrigger,
          autoUpdateChannel: this.finalAutoUpdateChannel,
          installVariant: this.installVariant,
          channelConfigLocation: this.channelConfigLocation,
          sessionStartDatetime: null,
          machineStartDatetime: null,
          machineId: null,
        },
      };
      switch (eventType) {
        case 'update-available':
          mainWebContents.send('display-client-banner', eventData);
          break;
        case 'download-progress':
          if (!this.didPublishDownloadProgress) {
            this.downloadProgressDelayTimer = setTimeout(() => {
              mainWebContents.send('display-client-banner', eventData);
            }, DOWNLOAD_PROGRESS_BANNER_DELAY);
            this.didPublishDownloadProgress = true;
          }
          break;
        case 'update-downloaded':
          if (this.downloadProgressDelayTimer) {
            clearTimeout(this.downloadProgressDelayTimer);
          }
          this.isUpdateAvailable = true;
          mainWebContents.send('display-client-banner', eventData);
          if (isMac) {
            config.backupGlobalConfig();
          }
      }
    }
  };

  private getGenericServerOptions = async (): Promise<GenericServerOptions> => {
    await this.setAutoUpdateChannel();
    logger.info(
      `auto-update-handler: using channel ${this.finalAutoUpdateChannel}`,
    );

    return {
      provider: 'generic',
      url: this.getUpdateUrl(),
      channel: this.finalAutoUpdateChannel || null,
    };
  };

  private setAutoUpdateChannel = async (): Promise<void> => {
    const {
      autoUpdateChannel,
      installVariant,
      betaAutoUpdateChannelEnabled,
      latestAutoUpdateChannelEnabled,
    } = config.getConfigFields([
      'autoUpdateChannel',
      'installVariant',
      'betaAutoUpdateChannelEnabled',
      'latestAutoUpdateChannelEnabled',
    ]);

    this.channelConfigLocation = ChannelConfigLocation.LOCALFILE;
    this.finalAutoUpdateChannel = autoUpdateChannel;
    this.installVariant = installVariant;

    const { url: userUrl } = config.getUserConfigFields(['url']);
    const { url: globalUrl } = config.getGlobalConfigFields(['url']);
    const url = userUrl ? userUrl : globalUrl;
    const isCorp =
      (url && url.startsWith('https://corporate.symphony.com')) || false;

    // Corp should keep the ability to get auto-update channel from user config as top prio
    if (isCorp && this.finalAutoUpdateChannel !== UpdateChannel.LATEST) {
      return;
    }

    const pmp = config.getFilteredCloudConfigFields([
      'sdaInstallerMsiUrlEnabledVisible',
      'sdaInstallerMsiUrlBetaEnabledVisible',
    ]) as IConfig;

    if (
      Object.keys(pmp).length > 0 &&
      !pmp?.sdaInstallerMsiUrlEnabledVisible &&
      !pmp?.sdaInstallerMsiUrlBetaEnabledVisible
    ) {
      this.finalAutoUpdateChannel = UpdateChannel.LATEST;
      this.channelConfigLocation = ChannelConfigLocation.ACP;
    }

    if (
      Object.keys(pmp).length === 0 ||
      pmp.sdaInstallerMsiUrlEnabledVisible ||
      pmp.sdaInstallerMsiUrlBetaEnabledVisible
    ) {
      if (latestAutoUpdateChannelEnabled) {
        this.finalAutoUpdateChannel = UpdateChannel.LATEST;
      }
      if (betaAutoUpdateChannelEnabled) {
        this.finalAutoUpdateChannel = UpdateChannel.BETA;
      }
      this.channelConfigLocation = ChannelConfigLocation.ACP;
    }

    // Registry has higher priority
    if (isWindowsOS) {
      await retrieveWindowsRegistry();
      const registryAutoUpdate = RegistryStore.getRegistry();
      const identifiedChannelFromRegistry = [
        EChannelRegistry.BETA,
        EChannelRegistry.LATEST,
      ].includes(registryAutoUpdate.currentChannel)
        ? registryAutoUpdate.currentChannel
        : '';
      if (identifiedChannelFromRegistry) {
        this.finalAutoUpdateChannel = identifiedChannelFromRegistry;
        this.channelConfigLocation = ChannelConfigLocation.REGISTRY;
      }
    }
  };
}

const autoUpdate = new AutoUpdate();

export { autoUpdate };
