import { BrowserWindow } from 'electron';
import { presenceStatusStore } from '.';
import { apiName } from '../../common/api-interface';
import { isMac } from '../../common/env';
import { logger } from '../../common/logger';
import { presenceStatus } from '../presence-status-handler';
import { ICustomBrowserWindow, windowHandler } from '../window-handler';
import {
  getWindowByName,
  hideFullscreenWindow,
  showBadgeCount,
} from '../window-utils';

export interface IWindowObject {
  windows: IWindowState[];
}

export interface IWindowState {
  id: string;
  minimized?: boolean;
  focused?: boolean;
  isFullScreen?: boolean;
  isVisible?: boolean;
}

export class WindowStore {
  public windowsRestored: boolean = true;
  private windowVariable: IWindowObject = {
    windows: [],
  };

  // Send signal
  public setWindowStore = (signalData: IWindowObject) => {
    this.windowVariable = { ...signalData };
  };

  // Destroy signal
  public destroyWindowStore = () => {
    this.windowVariable = {
      windows: [],
    } as IWindowObject;
  };

  // Retrieve signal
  public getWindowStore = (): IWindowObject => {
    return { ...this.windowVariable } as IWindowObject;
  };

  public hideWindowsOnCapturing = (hideOnCapture?: boolean) => {
    if (hideOnCapture) {
      this.windowsRestored = false;
      const currentWindows = BrowserWindow.getAllWindows();

      currentWindows.forEach((currentWindow) => {
        const isFullScreen = currentWindow.isFullScreen();
        const isMinimized = currentWindow.isMinimized();
        if (
          (currentWindow as ICustomBrowserWindow).winName !==
          apiName.notificationWindowName
        ) {
          if (isMac) {
            if (isFullScreen) {
              hideFullscreenWindow(currentWindow);
              // No need to hide minimized windows
            } else if (!isMinimized) {
              currentWindow?.hide();
            }
          } else {
            currentWindow.hide();
          }
        }
      });
    }
  };

  public restoreWindows = (hideOnCapture?: boolean) => {
    if (hideOnCapture) {
      this.restoreNotificationProperties();
      const storedWindows = this.getWindowStore();
      let _currentWindow = storedWindows.windows.find(
        (currentWindow) => currentWindow.focused,
      );
      if (!_currentWindow) {
        // In case there is no window focused, we automatically focus on the main one.
        _currentWindow = storedWindows.windows.find(
          (currentWindow) => currentWindow.id === 'main',
        );
        if (_currentWindow) {
          _currentWindow!.focused = true;
        }
      }

      let focusedWindowToRestore: ICustomBrowserWindow | undefined;

      const fullscreenedWindows: IWindowState[] = [];
      // Restoring all windows except focused one
      storedWindows.windows.forEach((currentWindow) => {
        if (currentWindow) {
          const window: ICustomBrowserWindow | undefined = getWindowByName(
            currentWindow.id || '',
          ) as ICustomBrowserWindow;
          if (window) {
            if (currentWindow.isFullScreen) {
              fullscreenedWindows.push(currentWindow);
            } else if (!currentWindow.focused) {
              window.showInactive();
              window.moveTop();
              if (currentWindow.minimized) {
                window.minimize();
              }
            }
            if (currentWindow.focused) {
              focusedWindowToRestore = window;
            }
          }
        }
      });

      // First item in array should be the focused window
      fullscreenedWindows.sort((x: IWindowState, y: IWindowState) =>
        x.focused === y.focused ? 0 : x.focused ? -1 : 1,
      );
      this.putWindowInFullScreenAndFocus(
        fullscreenedWindows,
        focusedWindowToRestore,
      );

      const mainWindow = windowHandler.getMainWindow();
      if (mainWindow) {
        const items = presenceStatus.createThumbarButtons();
        presenceStatus.updateSystemTrayPresence();
        mainWindow?.setThumbarButtons(items);
        logger.info('window-store: restoring thumbnail toolbar buttons');
      }

      showBadgeCount(presenceStatusStore.getNotificationCount());

      // Store reset
      this.destroyWindowStore();
    }
  };

  /**
   * Restores notification properties reset to default post hiding main window
   * @param windowsNames
   */
  private restoreNotificationProperties = () => {
    const windows = BrowserWindow.getAllWindows();

    windows
      .filter(
        (window) =>
          (window as ICustomBrowserWindow).winName ===
          apiName.notificationWindowName,
      )
      .map((notificationWindow) => {
        notificationWindow.setAlwaysOnTop(true);
        notificationWindow.setSkipTaskbar(true);
      });
  };

  /**
   * Restores windows that are in fullscreen and focus on the right window
   * On macOS, windows in fullscreen need to be restore one by one
   * @param windowsNames
   */
  private putWindowInFullScreenAndFocus(
    windows: IWindowState[],
    windowToFocus?: BrowserWindow,
  ) {
    if (windows.length) {
      const windowDetails = windows[windows.length - 1];
      const window: ICustomBrowserWindow | undefined = getWindowByName(
        windowDetails.id || '',
      ) as ICustomBrowserWindow;
      window.once('enter-full-screen', () => {
        windows.pop();
        this.putWindowInFullScreenAndFocus(windows, windowToFocus);
      });
      window.setFullScreen(true);
    } else {
      if (windowToFocus) {
        windowToFocus?.show();
        windowToFocus?.moveTop();
        windowHandler.moveSnippingToolWindow(windowToFocus);
      }
      this.windowsRestored = true;
    }
  }
}
