import { BrowserWindow } from 'electron';
import { isMac } from '../../common/env';
import { getWindowByName } from '../window-utils';

export interface IWindowObject {
  windows: IWindowState[];
}

export interface IWindowState {
  id: string;
  minimized?: boolean;
  focused?: boolean;
  isFullScreen?: boolean;
}

export class WindowStore {
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
      const currentWindows = BrowserWindow.getAllWindows();

      currentWindows.forEach((currentWindow) => {
        const isFullScreen = currentWindow.isFullScreen();
        if (isFullScreen) {
          this.hideFullscreenWindow(currentWindow);
        } else {
          currentWindow?.hide();
        }
      });
    }
  };

  public focusWindowsSnippingFinished = (hideOnCapture?: boolean) => {
    if (hideOnCapture) {
      const currentWindows = this.getWindowStore();
      const currentWindow = currentWindows.windows.find(
        (currentWindow) => currentWindow.focused,
      );
      if (currentWindow) {
        const window = getWindowByName(currentWindow.id || '');
        if (window) {
          if (!currentWindow.minimized) {
            window.show();
          }

          if (currentWindow.isFullScreen) {
            setTimeout(() => {
              window.setFullScreen(true);
            }, 0);
          }

          if (currentWindow.focused) {
            window.focus();
          }
        }
      }
    }
  };

  public restoreWindowsOnCapturing = (hideOnCapture?: boolean) => {
    if (hideOnCapture) {
      const currentWindows = this.getWindowStore();
      currentWindows.windows.forEach((currentWindow) => {
        const window = getWindowByName(currentWindow.id || '');
        if (window) {
          if (!currentWindow.minimized) {
            window.show();
          }

          if (currentWindow.isFullScreen) {
            window.setFullScreen(true);
          }

          if (currentWindow.focused) {
            window.focus();
          }
        }
      });

      this.destroyWindowStore();
    }
  };

  private hideFullscreenWindow = (window: BrowserWindow) => {
    window.once('leave-full-screen', () => {
      if (isMac) {
        window.hide();
      } else {
        setTimeout(() => {
          window.hide();
        }, 0);
      }
    });
    window.setFullScreen(false);
  };
}
