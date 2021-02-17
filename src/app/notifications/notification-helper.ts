import {
  ElectronNotificationData,
  INotificationData,
  NotificationActions,
} from '../../common/api-interface';
import { isWindowsOS } from '../../common/env';
import { notification } from '../../renderer/notification';
import { windowHandler } from '../window-handler';
import { windowExists } from '../window-utils';
import { ElectronNotification } from './electron-notification';

class NotificationHelper {
  private electronNotification: Map<number, ElectronNotification>;
  private activeElectronNotification: Map<string, ElectronNotification>;

  constructor() {
    this.electronNotification = new Map<number, ElectronNotification>();
    this.activeElectronNotification = new Map<string, ElectronNotification>();
  }

  /**
   * Displays Electron/HTML notification based on the
   * isElectronNotification flag
   *
   * @param options {INotificationData}
   */
  public showNotification(options: INotificationData) {
    if (options.isElectronNotification) {
      // MacOS: Electron notification only supports static image path
      options.icon = this.getIcon(options);

      // This is replace notification with same tag
      if (this.activeElectronNotification.has(options.tag)) {
        const electronNotification = this.activeElectronNotification.get(
          options.tag,
        );
        if (electronNotification) {
          electronNotification.close();
        }
        this.activeElectronNotification.delete(options.tag);
      }

      const electronToast = new ElectronNotification(
        options,
        this.notificationCallback,
      );
      this.electronNotification.set(options.id, electronToast);
      this.activeElectronNotification.set(options.tag, electronToast);
      electronToast.show();
      return;
    }
    notification.showNotification(options, this.notificationCallback);
  }

  /**
   * Closes a specific notification by id
   *
   * @param id {number} - unique id assigned to a specific notification
   */
  public async closeNotification(id: number) {
    if (this.electronNotification.has(id)) {
      const electronNotification = this.electronNotification.get(id);
      if (electronNotification) {
        electronNotification.close();
      }
      return;
    }
    await notification.hideNotification(id);
  }

  /**
   * Sends the notification actions event to the web client
   *
   * @param event {NotificationActions}
   * @param data {ElectronNotificationData}
   * @param notificationData {ElectronNotificationData}
   */
  public notificationCallback(
    event: NotificationActions,
    data: ElectronNotificationData,
    notificationData: ElectronNotificationData,
  ) {
    const mainWindow = windowHandler.getMainWindow();
    if (mainWindow && windowExists(mainWindow) && mainWindow.webContents) {
      mainWindow.webContents.send('notification-actions', {
        event,
        data,
        notificationData,
      });
    }
  }

  /**
   * Return the correct icon based on platform
   * @param options
   * @private
   */
  private getIcon(options: INotificationData): string | undefined {
    return isWindowsOS ? options.icon : undefined;
  }
}

const notificationHelper = new NotificationHelper();
export default notificationHelper;
