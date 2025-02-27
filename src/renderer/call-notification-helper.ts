import { callNotification } from '../app/notifications/call-notification';
import { windowHandler } from '../app/window-handler';
import {
  ElectronNotificationData,
  ICallNotificationData,
  NotificationActions,
} from '../common/api-interface';

class CallNotificationHelper {
  /**
   * Displays HTML call notification
   *
   * @param options {ICallNotificationData}
   */
  public showNotification(options: ICallNotificationData) {
    callNotification.createCallNotificationWindow(
      options,
      this.notificationCallback,
    );
  }

  /**
   * Closes a specific notification by id
   *
   * @param id {number} - unique id assigned to a specific notification
   */
  public async closeNotification(id: number) {
    await callNotification.closeNotification(id);
  }

  /**
   * Sends the notification actions event to the web client
   *
   * @param event {NotificationActions}
   * @param data {ElectronNotificationData}
   */
  public notificationCallback(
    event: NotificationActions,
    data: ElectronNotificationData,
  ) {
    const mainWebContents = windowHandler.getMainWebContents();
    if (mainWebContents && !mainWebContents.isDestroyed()) {
      mainWebContents.send('call-notification-actions', {
        event,
        data,
      });
    }
  }
}

const callNotificationHelper = new CallNotificationHelper();
export default callNotificationHelper;
