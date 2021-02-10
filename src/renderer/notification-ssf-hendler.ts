import { remote } from 'electron';

import {
  INotificationData,
  NotificationActions,
} from '../common/api-interface';
const notification = remote.require('../renderer/notification').notification;

let latestID = 0;

/**
 * Implementation for notifications interface,
 * this class is to mock the Window.Notification interface
 */
export default class SSFNotificationHandler {
  public _data: INotificationData;

  private readonly id: number;
  private readonly eventHandlers = {
    onClick: (event: NotificationActions, _data: INotificationData) =>
      this.notificationClicked(event),
  };
  private notificationClickCallback: (({ target }) => {}) | undefined;
  private notificationCloseCallback: (({ target }) => {}) | undefined;

  constructor(title, options) {
    this.id = latestID;
    latestID++;
    notification.showNotification(
      { ...options, title, id: this.id },
      this.eventHandlers.onClick,
    );
    this._data = options.data;
  }

  /**
   * Closes notification
   */
  public close(): void {
    notification.hideNotification(this.id);
  }

  /**
   * Always allow showing notifications.
   * @return {string} 'granted'
   */
  static get permission(): string {
    return 'granted';
  }

  /**
   * Returns data object passed in via constructor options
   */
  get data(): INotificationData {
    return this._data;
  }

  /**
   * Adds event listeners for 'click', 'close', 'show', 'error' events
   *
   * @param {String} event  event to listen for
   * @param {func}   cb     callback invoked when event occurs
   */
  public addEventListener(event: string, cb: () => {}): void {
    if (event && typeof cb === 'function') {
      switch (event) {
        case 'click':
          this.notificationClickCallback = cb;
          break;
        case 'close':
          this.notificationCloseCallback = cb;
          break;
      }
    }
  }

  /**
   * Handles the callback based on the event name
   *
   * @param event {NotificationActions}
   */
  private notificationClicked(event: NotificationActions): void {
    switch (event) {
      case NotificationActions.notificationClicked:
        if (
          this.notificationClickCallback &&
          typeof this.notificationClickCallback === 'function'
        ) {
          this.notificationClickCallback({ target: this });
        }
        break;
      case NotificationActions.notificationClosed:
        if (
          this.notificationCloseCallback &&
          typeof this.notificationCloseCallback === 'function'
        ) {
          this.notificationCloseCallback({ target: this });
        }
    }
  }
}
