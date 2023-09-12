import { WebContents } from 'electron';

export interface IAnalyticsData {
  element: AnalyticsElements;
  action_type?:
    | MenuActionTypes
    | ScreenSnippetActionTypes
    | ToastNotificationActionTypes
    | SDAUserSessionActionTypes;
  action_result?: AnalyticsActions;
  extra_data?: object;
}

export interface ICrashData extends IAnalyticsData {
  process: SDACrashProcess;
  crashCause: string;
  windowName: string;
  miniDump?: string;
}

export interface ISessionData extends IAnalyticsData {
  extra_data?: {
    sessionStartDatetime?: string;
    machineStartDatetime?: string;
    machineId?: string;
    InstallVariant?: string;
    osName?: string;
    osVersion?: string;
    osLanguage?: string;
    osTimeZone?: string;
    cpuNumberOfCores?: number;
    cpuMaxFrequency?: number;
    cpuUsagePercent?: number;
    memoryTotal?: number;
    memoryUsedPercent?: number;
    sdaUsedMemory?: number;
    memoryAvailable?: number;
    vdi?: boolean;
    endReason?: string;
    crashProcess?: string;
  },
}

export enum MenuActionTypes {
  AUTO_LAUNCH_ON_START_UP = 'auto_launch_on_start_up',
  ALWAYS_ON_TOP = 'always_on_top',
  MINIMIZE_ON_CLOSE = 'minimize_on_close',
  FLASH_NOTIFICATION_IN_TASK_BAR = 'flash_notification_in_task_bar',
  HAMBURGER_MENU = 'hamburger_menu',
  REFRESH_APP_IN_IDLE = 'refresh_app_in_idle',
}

export enum ScreenSnippetActionTypes {
  SCREENSHOT_TAKEN = 'screenshot_taken',
  ANNOTATE_ADDED_PEN = 'annotate_added_pen',
  ANNOTATE_ADDED_HIGHLIGHT = 'annotate_added_highlight',
  ANNOTATE_ADD = 'annotate_done',
  ANNOTATE_CLEARED = 'annotate_cleared',
  ANNOTATE_ERASED = 'annotate_erased',
  ANNOTATE_COPY = 'annotate_copy',
  ANNOTATE_SAVE_AS = 'annotate_save_as',
  ANNOTATE_CLOSE = 'annotate_close',
}

export enum ToastNotificationActionTypes {
  TOAST_CLOSED = 'toast_closed',
}

export enum SDAUserSessionActionTypes {
  Start = 'Start',
  End = 'End',
  Login = 'Login',
  Logout = 'Logout',
  Crash = 'Crash',
}

export enum SDAEndReasonTypes {
  Reboot = 'Reboot',
  Closed = 'Closed',
  Crashed = 'Crashed',
}

export enum AnalyticsActions {
  ENABLED = 'ON',
  DISABLED = 'OFF',
}

export enum AnalyticsElements {
  MENU = 'Menu',
  SCREEN_CAPTURE_ANNOTATE = 'screen_capture_annotate',
  TOAST_NOTIFICATION = 'toast_notification',
  SDA_CRASH = 'sda_crash',
  SDA_SESSION = 'sda_session',
}

export enum SDACrashProcess {
  MAIN = 'main',
  RENDERER = 'renderer',
  GPU = 'gpu',
}

const MAX_EVENT_QUEUE_LENGTH = 50;
const analyticsCallback = 'analytics-callback';

class Analytics {
  private preloadWindow: WebContents | undefined;
  private analyticsEventQueue: IAnalyticsData[] = [];

  /**
   * Stores the reference to the preload window
   *
   * @param webContents {WeContents}
   */
  public registerPreloadWindow(webContents: WebContents): void {
    this.preloadWindow = webContents;

    if (!(this.preloadWindow && !this.preloadWindow.isDestroyed())) {
      return;
    }
    if (this.analyticsEventQueue && this.analyticsEventQueue.length > 0) {
      this.analyticsEventQueue.forEach((eventData) => {
        if (this.preloadWindow && !this.preloadWindow.isDestroyed()) {
          if (eventData.element === AnalyticsElements.SDA_CRASH) {
            eventData = eventData as ICrashData;
          }
          this.preloadWindow.send(analyticsCallback, eventData);
        }
      });
      this.resetAnalytics();
    }
  }

  /**
   * Sends the analytics events to the web client
   *
   * @param eventData {IAnalyticsData}
   */
  public track(eventData: IAnalyticsData): void {
    if (eventData.element === AnalyticsElements.SDA_CRASH) {
      eventData = eventData as ICrashData;
    }
    if (this.preloadWindow && !this.preloadWindow.isDestroyed()) {
      this.preloadWindow.send(analyticsCallback, eventData);
      return;
    }
    this.analyticsEventQueue.push(eventData);
    // don't store more than specified limit. keep most recent events.
    if (this.analyticsEventQueue.length > MAX_EVENT_QUEUE_LENGTH) {
      this.analyticsEventQueue.shift();
    }
  }

  /**
   * Clears the analytics queue
   */
  public resetAnalytics(): void {
    this.analyticsEventQueue = [];
  }
}

const analytics = new Analytics();

export { analytics };
