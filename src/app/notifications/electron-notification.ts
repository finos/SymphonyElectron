import { Notification, NotificationConstructorOptions } from 'electron';

import { ElectronNotificationData, INotificationData, NotificationActions } from '../../common/api-interface';

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

        this.once('click', this.onClick);
        this.once('reply', this.onReply);
    }

    /**
     * Notification on click handler
     * @param _event
     * @private
     */
    private onClick(_event: Event) {
        this.callback(NotificationActions.notificationClicked, this.options);
    }

    /**
     * Notification reply handler
     * @param _event
     * @param reply
     * @private
     */
    private onReply(_event: Event, reply: string) {
        this.callback(NotificationActions.notificationReply, this.options, reply);
    }
}
