import { ipcMain } from 'electron';
import {
  apiName,
  ElectronNotificationData,
  ICallNotificationData,
  NotificationActions,
} from '../../common/api-interface';
import { isDevEnv, isMac } from '../../common/env';
import { logger } from '../../common/logger';
import { notification } from '../../renderer/notification';
import {
  AUX_CLICK,
  ICustomBrowserWindow,
  IS_NODE_INTEGRATION_ENABLED,
  IS_SAND_BOXED,
} from '../window-handler';
import { createComponentWindow, windowExists } from '../window-utils';

const CALL_NOTIFICATION_WIDTH = 264;
const CALL_NOTIFICATION_HEIGHT = 290;

class CallNotification {
  private callNotificationWindow: ICustomBrowserWindow | undefined;
  private notificationCallbacks: Map<
    number,
    (event: NotificationActions, data: ElectronNotificationData) => void
  > = new Map();

  constructor() {
    ipcMain.on('call-notification-clicked', (_event, windowId) => {
      this.notificationClicked(windowId);
    });
    ipcMain.on('call-notification-on-accept', (_event, windowId) => {
      this.onCallNotificationOnAccept(windowId);
    });
    ipcMain.on('call-notification-on-reject', (_event, windowId) => {
      this.onCallNotificationOnReject(windowId);
    });
    ipcMain.on('notification-settings-update', async (_event) => {
      setTimeout(() => {
        const { x, y } = notification.getCallNotificationPosition();
        if (
          this.callNotificationWindow &&
          windowExists(this.callNotificationWindow)
        ) {
          try {
            this.callNotificationWindow.setPosition(
              parseInt(String(x), 10),
              parseInt(String(y), 10),
            );
          } catch (err) {
            logger.info(
              `Failed to set window position. x: ${x} y: ${y}. Contact the developers for more details`,
            );
          }
        }
      }, 500);
    });
  }

  public createCallNotificationWindow = (
    callNotificationData: ICallNotificationData,
    callback,
  ) => {
    if (
      this.callNotificationWindow &&
      windowExists(this.callNotificationWindow) &&
      this.callNotificationWindow.notificationData?.id
    ) {
      this.callNotificationWindow.notificationData = callNotificationData;
      this.callNotificationWindow.winName = apiName.notificationWindowName;
      this.notificationCallbacks.set(callNotificationData.id, callback);
      this.callNotificationWindow.webContents.send(
        'call-notification-data',
        callNotificationData,
      );
      return;
    }

    // Set stream id as winKey to link stream to the window
    this.callNotificationWindow = createComponentWindow(
      'call-notification',
      this.getCallNotificationOpts(),
      false,
    ) as ICustomBrowserWindow;

    this.callNotificationWindow.notificationData = callNotificationData;
    this.callNotificationWindow.winName = apiName.notificationWindowName;
    this.notificationCallbacks.set(callNotificationData.id, callback);

    this.callNotificationWindow.setVisibleOnAllWorkspaces(true);
    this.callNotificationWindow.setSkipTaskbar(true);
    this.callNotificationWindow.setAlwaysOnTop(true, 'screen-saver');
    const { x, y } = notification.getCallNotificationPosition();
    try {
      this.callNotificationWindow.setPosition(
        parseInt(String(x), 10),
        parseInt(String(y), 10),
      );
    } catch (err) {
      logger.info(
        `Failed to set window position. x: ${x} y: ${y}. Contact the developers for more details`,
      );
    }
    this.callNotificationWindow.webContents.once('did-finish-load', () => {
      if (
        !this.callNotificationWindow ||
        !windowExists(this.callNotificationWindow)
      ) {
        return;
      }
      this.callNotificationWindow.webContents.setZoomFactor(1);
      this.callNotificationWindow.webContents.setVisualZoomLevelLimits(1, 1);
      this.callNotificationWindow.webContents.send(
        'call-notification-data',
        callNotificationData,
      );
      this.callNotificationWindow.showInactive();
    });

    this.callNotificationWindow.once('closed', () => {
      this.callNotificationWindow = undefined;
    });
  };

  /**
   * Handles call notification click
   *
   * @param clientId {number}
   */
  public notificationClicked(clientId): void {
    const browserWindow = this.callNotificationWindow;
    if (
      browserWindow &&
      windowExists(browserWindow) &&
      browserWindow.notificationData
    ) {
      const data = browserWindow.notificationData;
      const callback = this.notificationCallbacks.get(clientId);
      if (typeof callback === 'function') {
        callback(NotificationActions.notificationClicked, data);
      }
      this.closeNotification(clientId);
    }
  }

  /**
   * Handles call notification success action which updates client
   * @param clientId {number}
   */
  public onCallNotificationOnAccept(clientId: number): void {
    const browserWindow = this.callNotificationWindow;
    if (
      browserWindow &&
      windowExists(browserWindow) &&
      browserWindow.notificationData
    ) {
      const data = browserWindow.notificationData;
      const callback = this.notificationCallbacks.get(clientId);
      if (typeof callback === 'function') {
        callback(NotificationActions.notificationAccept, data);
      }
      this.closeNotification(clientId);
    }
  }

  /**
   * Handles call notification success action which updates client
   * @param clientId {number}
   */
  public onCallNotificationOnReject(clientId: number): void {
    const browserWindow = this.callNotificationWindow;
    if (
      browserWindow &&
      windowExists(browserWindow) &&
      browserWindow.notificationData
    ) {
      const data = browserWindow.notificationData;
      const callback = this.notificationCallbacks.get(clientId);
      if (typeof callback === 'function') {
        callback(NotificationActions.notificationReject, data);
      }
      this.closeNotification(clientId);
    }
  }

  /**
   * Close the notification window
   */
  public closeNotification(clientId: number): void {
    const browserWindow = this.callNotificationWindow;
    if (browserWindow && windowExists(browserWindow)) {
      if (
        browserWindow.notificationData &&
        browserWindow.notificationData.id !== clientId
      ) {
        logger.info(
          'call-notification',
          `notification with the id ${browserWindow.notificationData.id} does match with clientID ${clientId}`,
        );
        return;
      }
      browserWindow.close();
      logger.info(
        'call-notification',
        'successfully closed call notification window',
      );
    }
    return;
  }

  private getCallNotificationOpts =
    (): Electron.BrowserWindowConstructorOptions => {
      const callNotificationOpts: Electron.BrowserWindowConstructorOptions = {
        width: CALL_NOTIFICATION_WIDTH,
        height: CALL_NOTIFICATION_HEIGHT,
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: false,
        show: false,
        frame: false,
        transparent: true,
        fullscreenable: false,
        acceptFirstMouse: true,
        modal: false,
        focusable: true,
        autoHideMenuBar: true,
        minimizable: false,
        maximizable: false,
        title: 'Call Notification - Symphony',
        webPreferences: {
          sandbox: IS_SAND_BOXED,
          nodeIntegration: IS_NODE_INTEGRATION_ENABLED,
          devTools: isDevEnv,
          disableBlinkFeatures: AUX_CLICK,
        },
      };
      if (isMac) {
        callNotificationOpts.type = 'panel';
      }
      return callNotificationOpts;
    };
}

const callNotification = new CallNotification();

export { callNotification };
