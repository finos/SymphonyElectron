export interface IAnalyticsData {
    element: string;
    action_type: MenuActionTypes;
    action_result: string;
}

export enum MenuActionTypes {
    AUTO_LAUNCH_ON_START_UP = 'auto_launch_on_start_up',
    ALWAYS_ON_TOP = 'always_on_top',
    MINIMIZE_ON_CLOSE = 'minimize_on_close',
    FLASH_NOTIFICATION_IN_TASK_BAR = 'flash_notification_in_task_bar',
    HAMBURGER_MENU = 'hamburger_menu',
    REFRESH_APP_IN_IDLE = 'refresh_app_in_idle',
}

export enum AnalyticsActions {
    ENABLED = 'ON',
    DISABLED = 'OFF',
}

export enum AnalyticsElements {
    MENU = 'Menu',
}

const MAX_EVENT_QUEUE_LENGTH = 50;
const analyticsCallback = 'analytics-callback';

class Analytics {
    private preloadWindow: Electron.webContents | undefined;
    private analyticsEventQueue: IAnalyticsData[] = [];

    /**
     * Stores the reference to the preload window
     *
     * @param webContents {Electron.webContents}
     */
    public registerPreloadWindow(webContents: Electron.webContents): void {
        this.preloadWindow = webContents;

        if (!(this.preloadWindow && !this.preloadWindow.isDestroyed())) {
            return;
        }
        if (this.analyticsEventQueue && this.analyticsEventQueue.length > 0) {
            this.analyticsEventQueue.forEach((events) => {
                if (this.preloadWindow && !this.preloadWindow.isDestroyed()) {
                    this.preloadWindow.send(analyticsCallback, events);
                }
            });
        }
    }

    /**
     * Sends the analytics events to the web client
     *
     * @param eventData {IAnalyticsData}
     */
    public track(eventData: IAnalyticsData): void {
        if (this.preloadWindow && !this.preloadWindow.isDestroyed()) {
            this.preloadWindow.send(analyticsCallback, eventData);
            return;
        }
        this.analyticsEventQueue.push(eventData);
        // don't store more than 100 msgs. keep most recent log msgs.
        if (this.analyticsEventQueue.length > MAX_EVENT_QUEUE_LENGTH) {
            this.analyticsEventQueue.shift();
        }
    }
}

const analytics = new Analytics();

export { analytics };
