import { logger } from '../common/logger';
import { config } from './config-handler';
import { mainEvents } from './main-event-handler';
import { windowHandler } from './window-handler';
import { windowExists } from './window-utils';

// Mini View window size
export const DEFAULT_MINI_VIEW_WINDOW_WIDTH: number = 600;
export const MINI_VIEW_THRESHOLD_WINDOW_WIDTH: number = 750;

class MiniViewHandler {
  /**
   * Activates the mini view for the main application window.
   *
   * Sets the main window to mini view, using saved bounds if valid,
   * or a default width with the original height.
   *
   * @returns {void}
   */
  public activateMiniView = (): void => {
    windowHandler.setIsMiniViewTransition(true);
    logger.info('mini-view-handler: activateMiniView called');
    const mainWindow = windowHandler.getMainWindow();
    if (mainWindow && windowExists(mainWindow)) {
      if (mainWindow.isFullScreen()) {
        mainWindow.setFullScreen(false);
      }
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
        mainEvents.publish('unmaximize');
      }
      const { mainWinPosInMiniView } = config.getUserConfigFields([
        'mainWinPosInMiniView',
      ]);
      const [, height] = mainWindow.getSize();
      if (
        mainWinPosInMiniView &&
        mainWinPosInMiniView?.width &&
        mainWinPosInMiniView?.width <= DEFAULT_MINI_VIEW_WINDOW_WIDTH
      ) {
        logger.info(
          'mini-view-handler: setting window bounds from user config',
          mainWinPosInMiniView,
        );
        mainWindow.setBounds(mainWinPosInMiniView);
      } else {
        logger.info(
          `mini-view-handler: setting window width to ${DEFAULT_MINI_VIEW_WINDOW_WIDTH}, preserving height`,
        );
        mainWindow.setSize(DEFAULT_MINI_VIEW_WINDOW_WIDTH, height);
      }
      setTimeout(() => {
        windowHandler.setIsMiniViewTransition(false);
        this.notifyClient(true);
      }, 500);
      return;
    }
    windowHandler.setIsMiniViewTransition(false);
    logger.error(
      'mini-view-handler: activateMiniView main window does not exist or is invalid',
    );
  };

  /**
   * Deactivates the mini-view mode for the main application window.
   *
   * deactivates the main window from mini view, using saved bounds if valid,
   * or a default width with the original height.
   *
   * @returns {void}
   */
  public deactivateMiniView = (): void => {
    windowHandler.setIsMiniViewTransition(true);
    logger.info('mini-view-handler: deactivateMiniView called');
    const mainWindow = windowHandler.getMainWindow();
    if (mainWindow && windowExists(mainWindow)) {
      const { mainWinPos } = config.getUserConfigFields(['mainWinPos']);
      const [, height] = mainWindow.getSize();
      if (
        mainWinPos &&
        mainWinPos?.width &&
        mainWinPos?.width > MINI_VIEW_THRESHOLD_WINDOW_WIDTH
      ) {
        logger.info(
          'mini-view-handler: setting window bounds from user config',
          mainWinPos,
        );
        mainWindow.setBounds(mainWinPos);
      } else {
        logger.info(
          `mini-view-handler: setting window width to ${MINI_VIEW_THRESHOLD_WINDOW_WIDTH}, preserving height`,
        );
        mainWindow.setSize(MINI_VIEW_THRESHOLD_WINDOW_WIDTH, height);
      }
      setTimeout(() => {
        windowHandler.setIsMiniViewTransition(false);
        this.notifyClient(false);
      }, 500);
      return;
    }
    windowHandler.setIsMiniViewTransition(false);
    logger.error(
      'mini-view-handler: activateMiniView main window does not exist or is invalid',
    );
  };

  /**
   * Notifies the main application window about a change in the mini view state.
   *
   * @param {boolean} miniViewState - The new mini view state to be sent to the client.
   * `true` indicates mini view is enabled, `false` indicates it's disabled.
   * @returns {void}
   */
  public notifyClient = (miniViewState: boolean): void => {
    const mainWebContents = windowHandler.getMainWebContents();
    if (mainWebContents && !mainWebContents.isDestroyed()) {
      mainWebContents.send('set-mini-view', miniViewState);
    }
  };
}

const miniViewHandler = new MiniViewHandler();

export { miniViewHandler };
