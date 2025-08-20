import { callNotification } from '../app/notifications/call-notification';
import { menuStore } from '../app/stores';
import { windowHandler } from '../app/window-handler';
import {
  ElectronNotificationData,
  ICallNotificationData,
  INotificationClientSettings,
  NotificationActions,
} from '../common/api-interface';

class CallNotificationHelper {
  /**
   * Displays HTML call notification
   *
   * @param options {ICallNotificationData}
   */
  public showNotification(options: ICallNotificationData) {
    const clientNotificationSettings = menuStore.get(
      'clientNotificationSettings',
    ) as INotificationClientSettings;

    options.zoomFactor = clientNotificationSettings?.allowToastZoom
      ? windowHandler?.getMainWebContents()?.getZoomFactor() ?? 1
      : 1;
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
