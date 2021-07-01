export enum apiCmds {
  isOnline = 'is-online',
  getVersionInfo = 'get-version-info',
  registerLogger = 'register-logger',
  setBadgeCount = 'set-badge-count',
  badgeDataUrl = 'badge-data-url',
  activate = 'activate',
  registerBoundsChange = 'register-bounds-change',
  registerProtocolHandler = 'register-protocol-handler',
  registerLogRetriever = 'register-log-retriever',
  sendLogs = 'send-logs',
  registerAnalyticsHandler = 'register-analytics-handler',
  registerActivityDetection = 'register-activity-detection',
  showNotificationSettings = 'show-notification-settings',
  sanitize = 'sanitize',
  bringToFront = 'bring-to-front',
  openScreenPickerWindow = 'open-screen-picker-window',
  popupMenu = 'popup-menu',
  optimizeMemoryConsumption = 'optimize-memory-consumption',
  optimizeMemoryRegister = 'optimize-memory-register',
  setIsInMeeting = 'set-is-in-meeting',
  setLocale = 'set-locale',
  openScreenSnippet = 'open-screen-snippet',
  closeScreenSnippet = 'close-screen-snippet',
  keyPress = 'key-press',
  closeWindow = 'close-window',
  openScreenSharingIndicator = 'open-screen-sharing-indicator',
  closeScreenSharingIndicator = 'close-screen-sharing-indicator',
  downloadManagerAction = 'download-manager-action',
  getMediaSource = 'get-media-source',
  notification = 'notification',
  closeNotification = 'close-notification',
  isMisspelled = 'is-misspelled',
  memoryInfo = 'memory-info',
  swiftSearch = 'swift-search',
  getConfigUrl = 'get-config-url',
  registerRestartFloater = 'register-restart-floater',
  setCloudConfig = 'set-cloud-config',
  getCPUUsage = 'get-cpu-usage',
  checkMediaPermission = 'check-media-permission',
  registerDownloadHandler = 'register-download-handler',
  openDownloadedItem = 'open-downloaded-item',
  showDownloadedItem = 'show-downloaded-item',
  clearDownloadedItems = 'clear-downloaded-items',
  restartApp = 'restart-app',
  setIsMana = 'set-is-mana',
  showNotification = 'show-notification',
  closeAllWrapperWindows = 'close-all-windows',
  setZoomLevel = 'set-zoom-level',
}

export enum apiName {
  symphonyApi = 'symphony-api',
  mainWindowName = 'main',
  notificationWindowName = 'notification-window',
}

export const NOTIFICATION_WINDOW_TITLE = 'Notification - Symphony';

export interface IApiArgs {
  memoryInfo: Electron.ProcessMemoryInfo;
  word: string;
  cmd: apiCmds;
  isOnline: boolean;
  count: number;
  dataUrl: string;
  windowName: string;
  period: number;
  reason: string;
  sources: Electron.DesktopCapturerSource[];
  id: number;
  cpuUsage: Electron.CPUUsage;
  isInMeeting: boolean;
  locale: string;
  keyCode: number;
  windowType: WindowTypes;
  winKey: string;
  streamId: string;
  displayId: string;
  path: string;
  type: string;
  logName: string;
  logs: ILogs;
  cloudConfig: object;
  isMana: boolean;
  notificationOpts: object;
  notificationId: number;
  theme: Themes;
  zoomLevel: number;
}

export type Themes = 'light' | 'dark';

export type WindowTypes =
  | 'screen-picker'
  | 'screen-sharing-indicator'
  | 'notification-settings';

export interface IBadgeCount {
  count: number;
}

/**
 * Screen snippet
 */
export type ScreenSnippetDataType = 'ERROR' | 'image/png;base64';
export interface IScreenSnippet {
  data?: string;
  message?: string;
  type: ScreenSnippetDataType;
}

export interface IBoundsChange extends Electron.Rectangle {
  windowName: string;
}

/**
 * Screen sharing indicator
 */
export interface IScreenSharingIndicator {
  type: string;
  requestId: number;
  reason?: string;
}

export enum KeyCodes {
  Esc = 27,
  Alt = 18,
}

type Theme = '' | 'light' | 'dark';

/**
 * Notification
 */
export interface INotificationData {
  id: number;
  title: string;
  body: string;
  image: string;
  icon?: string;
  flash: boolean;
  color: string;
  tag: string;
  sticky: boolean;
  company: string;
  displayTime: number;
  isExternal: boolean;
  theme: Theme;
  isElectronNotification?: boolean;
  callback?: () => void;
  hasReply?: boolean;
}

export enum NotificationActions {
  notificationClicked = 'notification-clicked',
  notificationClosed = 'notification-closed',
  notificationReply = 'notification-reply',
}

/**
 * Screen sharing Indicator
 */
export interface IScreenSharingIndicatorOptions {
  displayId: string;
  requestId: number;
  streamId: string;
  stream?: MediaStream;
}

export interface IVersionInfo {
  containerIdentifier: string;
  containerVer: string;
  buildNumber: string;
  apiVer: string;
  searchApiVer: string;
}

export interface ICPUUsage {
  percentCPUUsage: number;
  idleWakeupsPerSecond: number;
}

export interface IDownloadManager {
  _id: string;
  fileName: string;
  fileDisplayName: string;
  savedPath: string;
  total: number;
  flashing?: boolean;
  count?: number;
}

export interface IMediaPermission {
  camera: string;
  microphone: string;
  screen: string;
}

export interface ILogMsg {
  level: LogLevel;
  details: any;
  showInConsole: boolean;
  startTime: number;
}

export type LogLevel =
  | 'error'
  | 'warn'
  | 'info'
  | 'verbose'
  | 'debug'
  | 'silly';

export interface ILogFile {
  filename: string;
  contents: string;
}

export interface ILogs {
  logName: string;
  logFiles: ILogFile[];
}

export interface IRestartFloaterData {
  windowName: string;
  bounds: Electron.Rectangle;
}

export type Reply = string;
export type ElectronNotificationData = Reply | object;
export type NotificationActionCallback = (
  event: NotificationActions,
  data: INotificationData,
) => void;
