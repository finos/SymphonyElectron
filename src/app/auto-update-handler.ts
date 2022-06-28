import electronLog from 'electron-log';
import { MacUpdater, NsisUpdater } from 'electron-updater';

import { isMac, isWindowsOS } from '../common/env';
import { logger } from '../common/logger';
import { whitelistHandler } from '../common/whitelist-handler';
import { config } from './config-handler';
import { windowHandler } from './window-handler';

// OS types
const MACOS = 'mac';
const WINDOWS = 'windows';

export class AutoUpdate {
  public isUpdateAvailable: boolean = false;
  public autoUpdater: MacUpdater | NsisUpdater | undefined = undefined;

  constructor() {
    if (isMac) {
      this.autoUpdater = new MacUpdater(this.getUpdateUrl());
    } else if (isWindowsOS) {
      this.autoUpdater = new NsisUpdater(this.getUpdateUrl());
    }

    if (this.autoUpdater) {
      this.autoUpdater.logger = electronLog;

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

      this.autoUpdater.on('update-downloaded', () => {
        this.isUpdateAvailable = true;
        const mainWebContents = windowHandler.mainWebContents;
        // Display client banner
        if (mainWebContents && !mainWebContents.isDestroyed()) {
          mainWebContents.send('display-client-banner', {
            reason: 'autoUpdate',
            action: 'update-available',
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
    setImmediate(() => {
      if (this.autoUpdater) {
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
      const updateCheckResult = await this.autoUpdater.checkForUpdatesAndNotify();
      logger.info('auto-update-handler: ', updateCheckResult);
    }
    logger.info('auto-update-handler: After checking auto update');
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
    const { autoUpdateUrl, autoUpdateChannel } = config.getConfigFields([
      'autoUpdateChannel',
      'autoUpdateUrl',
    ]);

    if (autoUpdateUrl) {
      logger.info(
        `auto-update-handler: autoUpdateUrl exists so, using it`,
        autoUpdateUrl,
      );
      return autoUpdateUrl;
    }

    const url = userConfigURL ? userConfigURL : globalConfigURL;
    const os = isMac ? MACOS : WINDOWS;

    const { subdomain, domain, tld } = whitelistHandler.parseDomain(url);
    logger.info(
      `auto-update-handler: using generic pod url`,
      `https://${subdomain}.${domain}.${tld}/${os}/${autoUpdateChannel}`,
    );

    return `https://${subdomain}.${domain}.${tld}/${os}/${autoUpdateChannel}`;
  };
}

const autoUpdate = new AutoUpdate();

export { autoUpdate };
