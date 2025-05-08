import { BrowserWindow, Rectangle, screen } from 'electron';

import { isMac } from '../common/env';
import { logger } from '../common/logger';
import { config } from './config-handler';
import { mainEvents } from './main-event-handler';
import { windowHandler } from './window-handler';
import { isValidBounds, windowExists } from './window-utils';

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
  public activateMiniView = async (): Promise<void> => {
    windowHandler.setIsMiniViewTransition(true);
    logger.info('mini-view-handler: activateMiniView called');
    const mainWindow = windowHandler.getMainWindow();
    if (mainWindow && windowExists(mainWindow)) {
      if (mainWindow.isFullScreen()) {
        await this.exitFullscreenAsync(mainWindow);
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
        mainWinPosInMiniView?.width <= DEFAULT_MINI_VIEW_WINDOW_WIDTH &&
        isValidBounds(mainWinPosInMiniView as Electron.Rectangle)
      ) {
        logger.info(
          'mini-view-handler: setting window bounds from user config',
          mainWinPosInMiniView,
        );
        const constrainedBounds = this.constrainBoundsToCurrentDisplay(
          mainWindow,
          mainWinPosInMiniView as Rectangle,
        );
        mainWindow.setBounds(constrainedBounds);
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
        mainWinPos?.width > MINI_VIEW_THRESHOLD_WINDOW_WIDTH &&
        isValidBounds(mainWinPos as Electron.Rectangle)
      ) {
        logger.info(
          'mini-view-handler: setting window bounds from user config',
          mainWinPos,
        );
        const constrainedBounds = this.constrainBoundsToCurrentDisplay(
          mainWindow,
          mainWinPos as Rectangle,
        );
        mainWindow.setBounds(constrainedBounds);
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

  private exitFullscreenAsync = (window: BrowserWindow): Promise<void> => {
    return new Promise<void>((resolve) => {
      window.once('leave-full-screen', () => {
        if (!window || !windowExists(window)) {
          logger.error(
            'mini-view-handler: window does not exist or is destroyed',
          );
          resolve();
          return;
        }
        if (isMac) {
          resolve();
        } else {
          setTimeout(() => {
            resolve();
          }, 0);
        }
      });
      window.setFullScreen(false);
    });
  };

  /**
   * Ensures the window bounds stay within the current display's work area.
   * This prevents the window from moving to a different display or becoming partially hidden.
   *
   * @param {BrowserWindow} window - The Electron window whose bounds need to be constrained
   * @param {Rectangle} newBounds - The desired new bounds for the window
   * @returns {Rectangle} The adjusted bounds that keep the window within the current display
   */
  private constrainBoundsToCurrentDisplay = (
    window: BrowserWindow,
    newBounds: Rectangle,
  ): Rectangle => {
    const currentDisplay = screen.getDisplayMatching(window.getBounds());
    const targetDisplay = screen.getDisplayMatching(newBounds);
    const workArea = currentDisplay.workArea;

    if (currentDisplay.id !== targetDisplay.id) {
      return {
        x: Math.round(workArea.x + (workArea.width - newBounds.width) / 2),
        y: Math.round(workArea.y + (workArea.height - newBounds.height) / 2),
        width: Math.min(workArea.width, newBounds.width),
        height: Math.min(workArea.height, newBounds.height),
      };
    }

    return {
      x: Math.max(
        workArea.x,
        Math.min(workArea.x + workArea.width - newBounds.width, newBounds.x),
      ),
      y: Math.max(
        workArea.y,
        Math.min(workArea.y + workArea.height - newBounds.height, newBounds.y),
      ),
      width: Math.min(workArea.width, newBounds.width),
      height: Math.min(workArea.height, newBounds.height),
    };
  };
}

const miniViewHandler = new MiniViewHandler();

export { miniViewHandler };
