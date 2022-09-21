import { GenericServerOptions } from 'builder-util-runtime';
import electronLog from 'electron-log';
import { MacUpdater, NsisUpdater } from 'electron-updater';

import { isMac, isWindowsOS } from '../common/env';
import { logger } from '../common/logger';
import { isUrl } from '../common/utils';
import { whitelistHandler } from '../common/whitelist-handler';
import { config } from './config-handler';
import { windowHandler } from './window-handler';

const DEFAULT_AUTO_UPDATE_CHANNEL = 'sda-update';

export class AutoUpdate {
  public isUpdateAvailable: boolean = false;
  public didPublishDownloadProgress: boolean = false;
  public autoUpdater: MacUpdater | NsisUpdater | undefined = undefined;

  constructor() {
    const opts = this.getGenericServerOptions();
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
        const mainWebContents = windowHandler.mainWebContents;
        // Display client banner
        if (mainWebContents && !mainWebContents.isDestroyed()) {
          mainWebContents.send('display-client-banner', {
            reason: 'autoUpdate',
            action: 'update-not-available',
          });
        }
      });

      this.autoUpdater.on('update-available', (info) => {
        const mainWebContents = windowHandler.mainWebContents;
        // Display client banner
        if (mainWebContents && !mainWebContents.isDestroyed()) {
          mainWebContents.send('display-client-banner', {
            reason: 'autoUpdate',
            action: 'update-available',
            data: info,
          });
        }
      });

      this.autoUpdater.on('download-progress', (info) => {
        const mainWebContents = windowHandler.mainWebContents;
        // Display client banner
        if (
          mainWebContents &&
          !mainWebContents.isDestroyed() &&
          !this.didPublishDownloadProgress
        ) {
          mainWebContents.send('display-client-banner', {
            reason: 'autoUpdate',
            action: 'download-progress',
            data: info,
          });
          this.didPublishDownloadProgress = true;
        }
      });

      this.autoUpdater.on('update-downloaded', (info) => {
        this.isUpdateAvailable = true;
        const mainWebContents = windowHandler.mainWebContents;
        // Display client banner
        if (mainWebContents && !mainWebContents.isDestroyed()) {
          mainWebContents.send('display-client-banner', {
            reason: 'autoUpdate',
            action: 'update-downloaded',
            data: info,
          });
        }
      });
    }
  }

  /**
   * Installs the latest update quits and relaunches application
   */
  public updateAndRestart = async (): Promise<void> => {
    if (!this.isUpdateAvailable) {
      return;
    }
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
  public checkUpdates = async (): Promise<void> => {
    logger.info('auto-update-handler: Checking for updates');
    if (this.autoUpdater) {
      const opts: GenericServerOptions = this.getGenericServerOptions();
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

  private getGenericServerOptions = (): GenericServerOptions => {
    const { autoUpdateChannel } = config.getConfigFields(['autoUpdateChannel']);
    const opts: GenericServerOptions = {
      provider: 'generic',
      url: this.getUpdateUrl(),
      channel: autoUpdateChannel || null,
    };
    return opts;
  };
}

const autoUpdate = new AutoUpdate();

export { autoUpdate };
