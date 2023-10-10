import { app, WebContents } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../../common/logger';

export interface IAnalyticsData {
  element: AnalyticsElements;
  action_type?:
    | MenuActionTypes
    | ScreenSnippetActionTypes
    | ToastNotificationActionTypes
    | SDAUserSessionActionTypes
    | InstallActionTypes;
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
    maxCPUUsagePercent?: number;
    memoryTotal?: number;
    memoryUsedPercent?: number;
    maxMemoryUsedPercent?: number;
    sdaUsedMemory?: number;
    memoryAvailable?: number;
    vdi?: boolean;
    endReason?: string;
    crashProcess?: string;
  };
}

export interface IInstallData extends IAnalyticsData {
  extra_data?: {
    installLocation: string;
    installType: string;
  };
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
  ForceReload = 'Force_reload',
}

export enum InstallActionTypes {
  InstallStarted = 'Install_started',
  InstallCompleted = 'Install_completed',
  InstallFailed = 'Install_failed',
}

export enum InstallTypes {
  Auto = 'auto',
  Manual = 'manual',
}

export enum InstallLocationTypes {
  PROG_FILES = 'PROG_FILES',
  REMOTE = 'REMOTE',
  LOCAL = 'LOCAL',
  CUSTOM = 'CUSTOM',
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
  SDA_INSTALL = 'sda_install',
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
  private analyticsEndEventQueue: IAnalyticsData[] = [];
  private analyticEventsDataFilePath = path.join(
    app.getPath('userData'),
    'analytics.json',
  );

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
    // Store these events and send them in the next SDA session
    if (
      eventData.action_type === SDAUserSessionActionTypes.End ||
      eventData.action_type === SDAUserSessionActionTypes.Logout ||
      eventData.action_type === InstallActionTypes.InstallStarted
    ) {
      this.analyticsEndEventQueue.push(eventData);
      return;
    }
    this.sendAnalyticsOrAddToQueue(eventData);
  }

  /**
   * Writes all the pending stats into a file
   */
  public writeAnalyticFile = () => {
    try {
      fs.writeFileSync(
        this.analyticEventsDataFilePath,
        JSON.stringify(this.analyticsEndEventQueue, null, 2),
        { encoding: 'utf8' },
      );
      logger.info(
        `analytics-handler: updated analytic values with the data ${JSON.stringify(
          this.analyticsEndEventQueue,
        )}`,
      );
    } catch (error) {
      logger.error(
        `analytics-handler: failed to update analytic with ${JSON.stringify(
          this.analyticsEndEventQueue,
        )}`,
        error,
      );
    }
  };

  /**
   * Sends all the locally stored stats
   */
  public sendLocalAnalytics = () => {
    if (fs.existsSync(this.analyticEventsDataFilePath)) {
      const localStats = fs.readFileSync(
        this.analyticEventsDataFilePath,
        'utf8',
      );
      if (!localStats) {
        return;
      }
      let parsedStats: ISessionData[];
      try {
        parsedStats = JSON.parse(localStats);
        logger.info(
          `analytics-handler: parsed stats JSON file with data`,
          parsedStats,
        );
        if (parsedStats && parsedStats.length) {
          parsedStats.forEach((event) => {
            this.sendAnalyticsOrAddToQueue(event);
          });
          fs.unlinkSync(this.analyticEventsDataFilePath);
        }
      } catch (e: any) {
        logger.error(
          `analytics-handler: parsing stats JSON file failed due to error ${e}`,
        );
      }
    }
    if (this.analyticsEndEventQueue.length > 0) {
      this.analyticsEndEventQueue.forEach((eventData) => {
        this.sendAnalyticsOrAddToQueue(eventData);
      });
      this.analyticsEndEventQueue = [];
    }
  };

  /**
   * Clears the analytics queue
   */
  public resetAnalytics(): void {
    this.analyticsEventQueue = [];
  }

  private sendAnalyticsOrAddToQueue = (eventData) => {
    if (this.preloadWindow && !this.preloadWindow.isDestroyed()) {
      this.preloadWindow.send(analyticsCallback, eventData);
      return;
    }
    this.analyticsEventQueue.push(eventData);
    // don't store more than specified limit. keep most recent events.
    if (this.analyticsEventQueue.length > MAX_EVENT_QUEUE_LENGTH) {
      this.analyticsEventQueue.shift();
    }
  };
}

const analytics = new Analytics();

export { analytics };
