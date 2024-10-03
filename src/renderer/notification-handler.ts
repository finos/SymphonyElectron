import { app, BrowserWindow, screen } from 'electron';

import { callNotification } from '../app/notifications/call-notification';
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
const MAX_VISIBLE_TOAST_FOR_CALL_NOTIFICATION = 0;
const NOTIFICATION_STACK_HEIGHT = 10;
export default class NotificationHandler {
  public settings: ISettings;
  public callNotificationSettings: ICorner = { x: 0, y: 0 };
  public nextInsertPos: ICorner = { x: 0, y: 0 };

  private readonly eventHandlers = {
    onSetup: () => this.setupNotificationPosition(),
  };

  private externalDisplay: Electron.Display | undefined;

  constructor(opts: ISettings) {
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
          `Failed to set window position. x: ${x} y: ${y}. Contact the developers for more details`,
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
      this.externalDisplay = screens.find(
        (screen) => screen.id.toString() === this.settings.displayId,
      );
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
        this.settings.corner.y += workAreaHeight - offSet;
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
    this.settings.maxVisibleNotifications =
      Math.floor(display.workAreaSize.height / this.settings.totalHeight) -
      MAX_VISIBLE_TOAST_FOR_CALL_NOTIFICATION;
  }

  /**
   * Stacks all active notifications on top of each other
   * like cards stacked with a small offset.
   *
   * @param activeNotifications {BrowserWindow[]}
   */
  public stackNotifications(activeNotifications: BrowserWindow[]) {
    if (!activeNotifications || activeNotifications.length === 0) {
      return;
    }

    let posY;

    switch (this.settings.startCorner) {
      case 'upper-right':
      case 'upper-left':
        posY = this.settings.firstPos.y;
        activeNotifications.forEach((notificationWindow, index) => {
          if (!windowExists(notificationWindow)) {
            return;
          }
          const newY = posY + NOTIFICATION_STACK_HEIGHT * index;
          const newX = this.settings.firstPos.x;
          this.setWindowPosition(notificationWindow, newX, newY);
        });
        break;
      case 'lower-right':
      case 'lower-left':
        posY = this.settings.firstPos.y;
        activeNotifications.forEach((notificationWindow, index) => {
          if (!windowExists(notificationWindow)) {
            return;
          }
          const newY = posY - NOTIFICATION_STACK_HEIGHT * index;
          const newX = this.settings.firstPos.x;
          this.setWindowPosition(notificationWindow, newX, newY);
        });
        break;
    }
  }

  /**
   * Unstacks all active notifications, restoring them to their original positions.
   *
   * @param activeNotifications {BrowserWindow[]}
   */
  public unstackNotifications(activeNotifications: BrowserWindow[]) {
    if (!activeNotifications || activeNotifications.length === 0) {
      return;
    }

    let cumulativeHeight = 0;

    activeNotifications.forEach((notificationWindow) => {
      if (!windowExists(notificationWindow)) {
        return;
      }

      // Get actual height of the notification
      const height = notificationWindow.getBounds().height;

      let newY;
      switch (this.settings.startCorner) {
        case 'upper-right':
        case 'upper-left':
          newY = this.settings.corner.y + cumulativeHeight;
          cumulativeHeight += height + this.settings.spacing;
          break;
        case 'lower-right':
        case 'lower-left':
          cumulativeHeight += height + this.settings.spacing;
          newY = this.settings.corner.y - cumulativeHeight;
          break;
      }

      // The x position should remain the same as the first position
      const newX = this.settings.firstPos.x;

      // Set the position of the notification window
      this.setWindowPosition(notificationWindow, newX, newY);
    });
  }

  /**
   * Calculates the next insert position for new notifications based on the current layout.
   *
   * @public
   * @param {BrowserWindow[]} activeNotifications - An array containing references to all active notification windows.
   * @returns {void}
   */
  public calcNextInsertPos(activeNotifications: BrowserWindow[]): void {
    let nextNotificationY: number = 0;
    activeNotifications.forEach((notification) => {
      if (notification && windowExists(notification)) {
        const [, height] = notification.getSize();
        const shift =
          height > this.settings.height
            ? NEXT_INSERT_POSITION_WITH_INPUT
            : NEXT_INSERT_POSITION;
        if (callNotification.isCallNotificationOpen()) {
          // When stacked, only consider padding separation for next insert position
          nextNotificationY += NOTIFICATIONS_PADDING_SEPARATION;
        } else {
          // When not stacked, use the standard shift height and padding
          nextNotificationY += shift + NOTIFICATIONS_PADDING_SEPARATION;
        }
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
   * Animates the position of notifications when the notification is closed or added.
   *
   * @public
   * @param {number} startPos - The starting position in the active notifications array from which to begin the animation.
   * @param {BrowserWindow[]} activeNotifications - An array containing references to all active notification windows.
   * @param {number} closedNotificationHeight - The height of the closed notification, used for adjusting positions.
   * @param {boolean} isReset - Indicates whether the notification positions should be reset to their original positions.
   * @returns {void}
   */
  public moveNotification(
    startPos: number,
    activeNotifications: BrowserWindow[],
    closedNotificationHeight: number = 0,
    isReset: boolean = false,
  ): void {
    if (startPos >= activeNotifications.length || startPos === -1) {
      return;
    }

    const notificationPosArray: number[] = [];
    for (let i = startPos; i < activeNotifications.length; i++) {
      notificationPosArray.push(i);
    }

    notificationPosArray.forEach((i) => {
      const notificationWindow = activeNotifications[i];
      if (!windowExists(notificationWindow)) {
        return;
      }

      let newY;
      const newX = this.settings.firstPos.x;

      if (callNotification.isCallNotificationOpen()) {
        if (isReset) {
          switch (this.settings.startCorner) {
            case 'upper-right':
            case 'upper-left':
              newY = this.settings.corner.y + NOTIFICATION_STACK_HEIGHT * i;
              break;
            case 'lower-right':
            case 'lower-left':
              const posY = this.settings.firstPos.y;
              newY = posY - NOTIFICATION_STACK_HEIGHT * i;
              break;
          }
        } else {
          newY = this.settings.firstPos.y + NOTIFICATION_STACK_HEIGHT * i;
        }
      } else {
        const [, y] = notificationWindow.getPosition();

        switch (this.settings.startCorner) {
          case 'upper-right':
          case 'upper-left':
            if (isReset) {
              newY = this.settings.corner.y + this.settings.totalHeight * i;
            } else {
              const heightAdjustment = closedNotificationHeight
                ? closedNotificationHeight + this.settings.spacing
                : this.settings.totalHeight + this.settings.spacing;
              newY = y - heightAdjustment;
            }
            break;
          default:
          case 'lower-right':
          case 'lower-left':
            if (isReset) {
              newY =
                this.settings.corner.y - this.settings.totalHeight * (i + 1);
            } else {
              const heightAdjustment = closedNotificationHeight
                ? closedNotificationHeight + this.settings.spacing
                : this.settings.totalHeight + this.settings.spacing;
              newY = y + heightAdjustment;
            }
            break;
        }
      }

      this.animateNotificationPosition(notificationWindow, newY, newX);
    });
  }

  /**
   * Moves a notification up in the stack.
   *
   * @public
   * @param {number} startPos - The starting position in the active notifications array.
   * @param {BrowserWindow[]} activeNotifications - An array containing references to all active notification windows.
   * @returns {void}
   */
  public moveNotificationUp(
    startPos: number,
    activeNotifications: BrowserWindow[],
  ): void {
    if (activeNotifications.length === 0 || startPos === -1) {
      return;
    }

    // Adjust startPos for lower corners
    if (['lower-right', 'lower-left'].includes(this.settings.startCorner)) {
      startPos = Math.max(0, startPos - 1);
    }

    const notificationPosArray: number[] = [];
    for (let i = startPos; i < activeNotifications.length; i++) {
      notificationPosArray.push(i);
    }

    notificationPosArray.forEach((i) => {
      const notificationWindow = activeNotifications[i];
      if (!windowExists(notificationWindow)) {
        return;
      }

      const [, y] = notificationWindow.getPosition();
      let newY: number;
      const newX = this.settings.firstPos.x;

      // Calculate new Y position based on the start corner
      switch (this.settings.startCorner) {
        case 'upper-right':
        case 'upper-left':
          newY = y + this.settings.differentialHeight;
          break;
        case 'lower-right':
        case 'lower-left':
          newY = y - this.settings.differentialHeight;
          break;
        default:
          newY = y;
      }

      // Animate the notification to the new position
      this.animateNotificationPosition(notificationWindow, newY, newX);
    });
  }

  /**
   * Get startPos, calc step size and start animationInterval
   * @param notificationWindow
   * @param newY
   * @param newX
   */
  private animateNotificationPosition(
    notificationWindow: Electron.BrowserWindow,
    newY: number,
    newX: number,
  ) {
    const [startX, startY] = notificationWindow.getPosition();
    const duration = this.settings.animationSteps;
    const startTime = Date.now();

    const animateStep = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      const currentX = startX + (newX - startX) * progress;
      const currentY = startY + (newY - startY) * progress;

      // Set new position
      this.setWindowPosition(notificationWindow, currentX, currentY);

      if (progress < 1) {
        setTimeout(animateStep, 16);
      } else {
        // Ensure final position is set
        this.setWindowPosition(notificationWindow, newX, newY);
      }
    };

    // Start the animation
    setTimeout(animateStep, 16);
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
