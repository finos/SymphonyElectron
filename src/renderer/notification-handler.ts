import * as asyncMap from 'async.map';
import { app, screen } from 'electron';

import { windowExists } from '../app/window-utils';
import { isLinux, isMac } from '../common/env';

interface ISettings {
  startCorner: startCorner;
  displayId: string;
  height: number;
  width: number;
  totalHeight: number;
  totalWidth: number;
  corner: ICorner;
  firstPos: ICorner;
  maxVisibleNotifications: number;
  animationSteps: number;
  animationStepMs: number;
  spacing: number;
  differentialHeight: number;
}

export interface ICorner {
  x: number;
  y: number;
}

type startCorner = 'upper-right' | 'upper-left' | 'lower-right' | 'lower-left';
const NEXT_INSERT_POSITION = 100;
const NEXT_INSERT_POSITION_WITH_INPUT = 142;
const NOTIFICATIONS_PADDING_SEPARATION = 12;
const CALL_NOTIFICATION_WIDTH = 264;
const CALL_NOTIFICATION_HEIGHT = 286;
export default class NotificationHandler {
  public settings: ISettings;
  public callNotificationSettings: ICorner = { x: 0, y: 0 };
  public nextInsertPos: ICorner = { x: 0, y: 0 };

  private readonly eventHandlers = {
    onSetup: () => this.setupNotificationPosition(),
  };

  private externalDisplay: Electron.Display | undefined;

  constructor(opts) {
    this.settings = opts as ISettings;
    this.setupNotificationPosition();

    app.once('ready', () => {
      screen.on('display-added', this.eventHandlers.onSetup);
      screen.on('display-removed', this.eventHandlers.onSetup);
      screen.on('display-metrics-changed', this.eventHandlers.onSetup);
    });
  }

  /**
   * Sets the position of the notification window
   *
   * @param window {BrowserWindow}
   * @param x {number}
   * @param y {number}
   */
  public setWindowPosition(
    window: Electron.BrowserWindow,
    x: number = 0,
    y: number = 0,
  ) {
    if (window && !window.isDestroyed()) {
      try {
        window.setPosition(parseInt(String(x), 10), parseInt(String(y), 10));
      } catch (err) {
        console.warn(
          'Failed to set window position. x: ' +
            x +
            ' y: ' +
            y +
            '. Contact the developers for more details',
        );
      }
    }
  }

  /**
   * Initializes / resets the notification positional values
   */
  public setupNotificationPosition() {
    // This feature only applies to windows & mac
    if (!app.isReady()) {
      return;
    }

    const screens = screen.getAllDisplays();
    if (screens && screens.length >= 0) {
      this.externalDisplay = screens.find((screen) => {
        const screenId = screen.id.toString();
        return screenId === this.settings.displayId;
      });
    }

    const display = this.externalDisplay || screen.getPrimaryDisplay();
    this.settings.corner.x = display.workArea.x;
    this.settings.corner.y = display.workArea.y;
    this.callNotificationSettings.x = display.workArea.x;
    this.callNotificationSettings.y = display.workArea.y;

    // update corner x/y based on corner of screen where notification should appear
    const workAreaWidth = display.workAreaSize.width;
    const workAreaHeight = display.workAreaSize.height;
    const offSet = isMac || isLinux ? 20 : 10;
    switch (this.settings.startCorner) {
      case 'upper-right':
        this.settings.corner.x += workAreaWidth - offSet;
        this.settings.corner.y += offSet;
        // Call Notification settings
        this.callNotificationSettings.x +=
          workAreaWidth - offSet - CALL_NOTIFICATION_WIDTH;
        this.callNotificationSettings.y +=
          workAreaHeight - offSet - CALL_NOTIFICATION_HEIGHT;
        break;
      case 'lower-right':
        this.settings.corner.x += workAreaWidth - offSet;
        this.settings.corner.y += workAreaHeight - offSet;
        // Call Notification settings
        this.callNotificationSettings.x +=
          workAreaWidth - offSet - CALL_NOTIFICATION_WIDTH;
        this.callNotificationSettings.y += offSet;
        break;
      case 'lower-left':
        this.settings.corner.x += offSet;
        this.settings.corner.y +=
          workAreaHeight - offSet - CALL_NOTIFICATION_HEIGHT;
        // Call Notification settings
        this.callNotificationSettings.x += offSet;
        this.callNotificationSettings.y += offSet;
        break;
      case 'upper-left':
        this.settings.corner.x += offSet;
        this.settings.corner.y += offSet;
        // Call Notification settings
        this.callNotificationSettings.x += offSet;
        this.callNotificationSettings.y +=
          workAreaHeight - offSet - CALL_NOTIFICATION_HEIGHT;
        break;
      default:
        // no change needed
        this.callNotificationSettings.x +=
          workAreaWidth - offSet - CALL_NOTIFICATION_WIDTH;
        this.callNotificationSettings.y +=
          workAreaHeight - offSet - CALL_NOTIFICATION_HEIGHT;
        break;
    }
    this.calculateDimensions();
    // Maximum amount of Notifications we can show:
    this.settings.maxVisibleNotifications = Math.floor(
      display.workAreaSize.height / this.settings.totalHeight,
    );
  }

  /**
   * Find next possible insert position (on top)
   */
  public calcNextInsertPos(activeNotifications) {
    let nextNotificationY: number = 0;
    activeNotifications.forEach((notification) => {
      if (notification && windowExists(notification)) {
        const [, height] = notification.getSize();
        const shift =
          height > this.settings.height
            ? NEXT_INSERT_POSITION_WITH_INPUT
            : NEXT_INSERT_POSITION;
        nextNotificationY += shift + NOTIFICATIONS_PADDING_SEPARATION;
      }
    });
    if (activeNotifications.length < this.settings.maxVisibleNotifications) {
      switch (this.settings.startCorner) {
        case 'upper-right':
        case 'upper-left':
          this.nextInsertPos.y = this.settings.corner.y + nextNotificationY;
          break;

        default:
        case 'lower-right':
        case 'lower-left':
          this.nextInsertPos.y =
            this.settings.corner.y - (nextNotificationY + NEXT_INSERT_POSITION);
          break;
      }
    }
  }

  /**
   * Moves the notification by one step
   *
   * @param startPos {number}
   * @param activeNotifications {ICustomBrowserWindow[]}
   * @param height {number} height of the closed notification
   * @param isReset {boolean} whether to reset all notification position
   */
  public moveNotificationDown(
    startPos,
    activeNotifications,
    height: number = 0,
    isReset: boolean = false,
  ) {
    if (startPos >= activeNotifications || startPos === -1) {
      return;
    }
    // Build array with index of affected notifications
    const notificationPosArray: number[] = [];
    for (let i = startPos; i < activeNotifications.length; i++) {
      notificationPosArray.push(i);
    }
    asyncMap(notificationPosArray, (i, done) => {
      // Get notification to move
      const notificationWindow = activeNotifications[i];
      if (!windowExists(notificationWindow)) {
        return;
      }
      const [, y] = notificationWindow.getPosition();

      // Calc new y position
      let newY;
      switch (this.settings.startCorner) {
        case 'upper-right':
        case 'upper-left':
          newY = isReset
            ? this.settings.corner.y + this.settings.totalHeight * i
            : y - height - this.settings.spacing;
          break;
        default:
        case 'lower-right':
        case 'lower-left':
          newY = isReset
            ? this.settings.corner.y - this.settings.totalHeight * (i + 1)
            : y + height + this.settings.spacing;
          break;
      }

      this.animateNotificationPosition(notificationWindow, newY, done);
    });
  }

  /**
   * Moves the notification by one step
   *
   * @param startPos {number}
   * @param activeNotifications {ICustomBrowserWindow[]}
   */
  public moveNotificationUp(startPos, activeNotifications) {
    if (startPos >= activeNotifications || startPos === -1) {
      return;
    }
    if (
      this.settings.startCorner === 'lower-right' ||
      this.settings.startCorner === 'lower-left'
    ) {
      startPos -= 1;
    }
    // Build array with index of affected notifications
    const notificationPosArray: number[] = [];
    for (let i = startPos; i < activeNotifications.length; i++) {
      notificationPosArray.push(i);
    }
    asyncMap(notificationPosArray, (i, done) => {
      // Get notification to move
      const notificationWindow = activeNotifications[i];
      if (!windowExists(notificationWindow)) {
        return;
      }
      const [, y] = notificationWindow.getPosition();

      // Calc new y position
      let newY;
      switch (this.settings.startCorner) {
        case 'upper-right':
        case 'upper-left':
          newY = y + this.settings.differentialHeight;
          break;
        default:
        case 'lower-right':
        case 'lower-left':
          newY = y - this.settings.differentialHeight;
          break;
      }

      this.animateNotificationPosition(notificationWindow, newY, done);
    });
  }

  /**
   * Get startPos, calc step size and start animationInterval
   * @param notificationWindow
   * @param newY
   * @param done
   * @private
   */
  private animateNotificationPosition(notificationWindow, newY, done) {
    const startY = notificationWindow.getPosition()[1];
    const step = (newY - startY) / this.settings.animationSteps;
    let curStep = 1;
    const animationInterval = setInterval(() => {
      // Abort condition
      if (curStep === this.settings.animationSteps) {
        this.setWindowPosition(
          notificationWindow,
          this.settings.firstPos.x,
          newY,
        );
        clearInterval(animationInterval);
        done(null, 'done');
        return;
      }
      // Move one step down
      this.setWindowPosition(
        notificationWindow,
        this.settings.firstPos.x,
        startY + curStep * step,
      );
      curStep++;
    }, this.settings.animationStepMs);
  }

  /**
   * Calculates the first and next notification insert position
   */
  private calculateDimensions() {
    // Calc totalHeight & totalWidth
    this.settings.totalHeight =
      this.settings.height + NOTIFICATIONS_PADDING_SEPARATION;
    this.settings.totalWidth = this.settings.width;

    let firstPosX;
    let firstPosY;
    switch (this.settings.startCorner) {
      case 'upper-right':
        firstPosX = this.settings.corner.x - this.settings.totalWidth;
        firstPosY = this.settings.corner.y;
        break;
      case 'lower-right':
        firstPosX = this.settings.corner.x - this.settings.totalWidth;
        firstPosY = this.settings.corner.y - this.settings.totalHeight;
        break;
      case 'lower-left':
        firstPosX = this.settings.corner.x;
        firstPosY = this.settings.corner.y - this.settings.totalHeight;
        break;
      case 'upper-left':
      default:
        firstPosX = this.settings.corner.x;
        firstPosY = this.settings.corner.y;
        break;
    }

    // Calc pos of first notification:
    this.settings.firstPos = {
      x: firstPosX,
      y: firstPosY,
    };

    // Set nextInsertPos
    this.nextInsertPos.x = this.settings.firstPos.x;
    this.nextInsertPos.y = this.settings.firstPos.y;
  }
}
