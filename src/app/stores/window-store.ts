import { BrowserWindow } from 'electron';
import { getWindowByName } from '../window-utils';

export interface IWindowObject {
  windows: IWindowState[];
}

export interface IWindowState {
  id: string;
  minimized?: boolean;
  focused?: boolean;
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
        currentWindow?.hide();
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
        if (!currentWindow.minimized) {
          getWindowByName(currentWindow.id || '')?.show();
        }

        if (currentWindow.focused) {
          getWindowByName(currentWindow.id || '')?.focus();
        }
      }
    }
  };

  public restoreWindowsOnCapturing = (hideOnCapture?: boolean) => {
    if (hideOnCapture) {
      const currentWindows = this.getWindowStore();
      currentWindows.windows.forEach((currentWindow) => {
        if (!currentWindow.minimized) {
          getWindowByName(currentWindow.id || '')?.show();
        }

        if (currentWindow.focused) {
          getWindowByName(currentWindow.id || '')?.focus();
        }
      });

      this.destroyWindowStore();
    }
  };
}
