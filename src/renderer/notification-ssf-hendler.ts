import { ipcRenderer } from 'electron';

import {
  apiCmds,
  apiName,
  INotificationData,
  NotificationActions,
} from '../common/api-interface';

let latestID = 0;

/**
 * Implementation for notifications interface,
 * this class is to mock the Window.Notification interface
 */
export default class SSFNotificationHandler {
  public _data: INotificationData;

  private readonly id: number;
  private notificationClickCallback: (({ target }) => {}) | undefined;
  private notificationCloseCallback: (({ target }) => {}) | undefined;

  constructor(title, options) {
    this.id = latestID;
    latestID++;
    const notificationOpts = { ...options, title, id: this.id };
    // ipc does not support sending Functions, Promises, Symbols, WeakMaps,
    // or WeakSets will throw an exception
    if (notificationOpts.callback) {
      delete notificationOpts.callback;
    }
    ipcRenderer.send(apiName.symphonyApi, {
      cmd: apiCmds.showNotification,
      notificationOpts,
    });

    ipcRenderer.once('notification-actions', (_event, args) => {
      if (args.id === this.id) {
        switch (args.event) {
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
            break;
          default:
            break;
        }
      }
    });
    this._data = options.data;
  }

  /**
   * Closes notification
   */
  public close(): void {
    ipcRenderer.send(apiName.symphonyApi, {
      cmd: apiCmds.closeNotification,
      notificationId: this.id,
    });
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
}
