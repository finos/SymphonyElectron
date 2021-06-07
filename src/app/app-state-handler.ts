import { app } from 'electron';
import { logger } from '../common/logger';

class AppStateHandler {
  /**
   * Restarts the app with the command line arguments
   * passed from the previous session
   */
  public restart() {
    logger.info(`Restarting app as per instruction from SFE`);
    app.relaunch();
    app.exit();
  }
}

const appStateHandler = new AppStateHandler();
export default appStateHandler;
