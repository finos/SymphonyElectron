import electronLog from 'electron-log';
import { MacUpdater, NsisUpdater } from 'electron-updater';
import { isMac, isWindowsOS } from '../common/env';
import { logger } from '../common/logger';
import { config } from './config-handler';
import { windowHandler } from './window-handler';

class AutoUpdate {
  public autoUpdater: MacUpdater | NsisUpdater | undefined = undefined;

  constructor() {
    const { autoUpdateUrl } = config.getGlobalConfigFields(['autoUpdateUrl']);
    if (autoUpdateUrl === '') {
      return;
    }
    if (isMac) {
      this.autoUpdater = new MacUpdater(autoUpdateUrl);
    } else if (isWindowsOS) {
      this.autoUpdater = new NsisUpdater(autoUpdateUrl);
    }

    if (this.autoUpdater) {
      this.autoUpdater.logger = electronLog;
      this.autoUpdater.on('update-downloaded', () => {
        // Handle update and restart for macOS
        if (isMac) {
          windowHandler.setIsAutoUpdating(true);
        }
        setImmediate(() => {
          if (this.autoUpdater) {
            this.autoUpdater.quitAndInstall();
          }
        });
      });
    }
  }

  /**
   * Checks for the latest updates
   */
  public async checkAutoUpdate() {
    logger.info('auto-update-handler: Checking for updates');
    if (this.autoUpdater) {
      const updateCheckResult = await this.autoUpdater.checkForUpdatesAndNotify();
      logger.info('auto-update-handler: ', updateCheckResult);
    }
    logger.info('auto-update-handler: After checking auto update');
  }
}

const autoUpdate = new AutoUpdate();

export { autoUpdate };
