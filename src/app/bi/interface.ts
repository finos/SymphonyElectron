export enum SDACrashProcess {
  MAIN = 'main',
  RENDERER = 'renderer',
  GPU = 'gpu',
}

export interface ICrashData extends IAnalyticsData {
  process: SDACrashProcess;
  crashCause: string;
  windowName: string;
  miniDump?: string;
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
