import { GenericServerOptions } from 'builder-util-runtime';
import electronLog from 'electron-log';
import { MacUpdater, NsisUpdater } from 'electron-updater';

import { isMac, isWindowsOS } from '../common/env';
import { logger } from '../common/logger';
import { isUrl } from '../common/utils';
import { whitelistHandler } from '../common/whitelist-handler';
import { sendAutoUpdateAnalytics } from './bi/auto-update-analytics';
import { InstallActionTypes, InstallTypes } from './bi/interface';
import { config, IConfig } from './config-handler';
import { retrieveWindowsRegistry } from './registry-handler';
import { EChannelRegistry, RegistryStore } from './stores/registry-store';
import { windowHandler } from './window-handler';

const DEFAULT_AUTO_UPDATE_CHANNEL = 'apps/sda-update/default';

export enum AutoUpdateTrigger {
  MANUAL = 'MANUAL',
  AUTOMATED = 'AUTOMATED',
}

export enum ChannelConfigLocation {
  LOCALFILE = 'LOCALEFILE',
  ACP = 'ACP',
  REGISTRY = 'REGISTRY',
}
const DOWNLOAD_PROGRESS_BANNER_DELAY = 1000 * 10; // 10 sec

const AUTO_UPDATE_REASON = 'autoUpdate';

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

  constructor() {
    this.getGenericServerOptions().then((opts) => {
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
          await this.updateEventHandler(info, 'update-downloaded');
        });

        this.autoUpdater.on('error', (error) => {
          this.autoUpdateTrigger = undefined;
          logger.error(
            'auto-update-handler: Error occurred while updating. ',
            error,
          );
        });
      }
    });
  }

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

  private updateEventHandler = async (info, eventType: string) => {
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
    const { autoUpdateChannel, installVariant, betaAutoUpdateChannelEnabled } =
      config.getConfigFields([
        'autoUpdateChannel',
        'installVariant',
        'betaAutoUpdateChannelEnabled',
      ]);

    const cc = config.getFilteredCloudConfigFields([
      'betaAutoUpdateChannelEnabled',
    ]) as IConfig;
    this.channelConfigLocation =
      Object.keys(cc).length === 0 || cc.betaAutoUpdateChannelEnabled
        ? ChannelConfigLocation.ACP
        : ChannelConfigLocation.LOCALFILE;

    this.finalAutoUpdateChannel = betaAutoUpdateChannelEnabled
      ? 'beta'
      : autoUpdateChannel;
    this.installVariant = installVariant;
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
