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
    const { id, ...notificationOptions } = options;
    const opts: NotificationConstructorOptions = {
      ...notificationOptions,
      ...(id !== undefined ? { id: String(id) } : {}),
    };
    super(opts);
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
