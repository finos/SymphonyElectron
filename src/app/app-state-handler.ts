import { powerSaveBlocker } from 'electron';
import { logger } from '../common/logger';
import { windowHandler } from './window-handler';
class AppStateHandler {
  private id?: number;

  /**
   * Restarts the app with the command line arguments
   * passed from the previous session
   */
  public restart() {
    logger.info(`Restarting app as per instruction from SFE`);
    windowHandler.exitApplication(true);
  }

  /**
   * Prevent the display to go to sleep
   */
  public preventDisplaySleep(preventSleep: boolean) {
    logger.info(
      'App-state: preventDisplaySleep, preventSleep: ' + preventSleep,
    );

    if (preventSleep) {
      if (this.id) {
        logger.info(
          'App-state: Stop previous power save blocker, id: ' + this.id,
        );
        powerSaveBlocker.stop(this.id);
        this.id = undefined;
      }
      this.id = powerSaveBlocker.start('prevent-display-sleep');
      logger.info('App-state: Prevent display to sleep, id: ' + this.id);
    } else {
      if (this.id !== undefined) {
        logger.info('App-state: Allow display to sleep, id: ' + this.id);
        powerSaveBlocker.stop(this.id);
        this.id = undefined;
      }
    }
  }
}

const appStateHandler = new AppStateHandler();
export default appStateHandler;
