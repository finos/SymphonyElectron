import { Notification, NotificationConstructorOptions } from 'electron';

import {
  ElectronNotificationData,
  INotificationData,
  NotificationActions,
} from '../../common/api-interface';

export class ElectronNotification extends Notification {
  private callback: (
    actionType: NotificationActions,
    data: INotificationData,
    notificationData?: ElectronNotificationData,
  ) => void;
  private options: INotificationData;

  constructor(options: INotificationData, callback) {
    super(options as NotificationConstructorOptions);
    this.callback = callback;
    this.options = options;

    this.once('click', (_event) => {
      this.callback(NotificationActions.notificationClicked, this.options);
    });
    this.once('reply', (_event, reply) => {
      this.callback(NotificationActions.notificationReply, this.options, reply);
    });
  }
}
