import { Notification, NotificationConstructorOptions } from 'electron';

import { ElectronNotificationData, INotificationData, NotificationActions } from '../../common/api-interface';

export class ElectronNotification extends Notification {
    private callback: (
        actionType: NotificationActions,
        data: INotificationData,
        extraData?: ElectronNotificationData,
    ) => void;
    private options: INotificationData;

    constructor(options: INotificationData, callback) {
        super(options as NotificationConstructorOptions);
        this.callback = callback;
        this.options = options;

        this.once('click', this.onClick);
        this.once('reply', this.onReply);
    }

    private onClick(_event: Event) {
        this.callback(NotificationActions.notificationClicked, this.options);
    }

    private onReply(_event: Event, reply: string) {
        this.callback(NotificationActions.notificationReply, this.options, reply);
    }
}
