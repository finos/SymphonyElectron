export interface IAnalyticData {
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

export enum AnalyticActions {
    ENABLED = 'ON',
    DISABLED = 'OFF',
}

export enum AnalyticElements {
    MENU = 'MENU',
}

const MAX_EVENT_QUEUE_LENGTH = 50;
const analyticCallback = 'analytic-callback';

class Analytics {
    private preloadWindow: Electron.webContents | undefined;
    private analyticEventQueue: IAnalyticData[] = [];

    /**
     * Stores the reference to the preload window
     *
     * @param webContents {Electron.webContents}
     */
    public registerPreloadWindow(webContents: Electron.webContents): void {
        this.preloadWindow = webContents;

        if (this.preloadWindow && !this.preloadWindow.isDestroyed()) {
            if (this.analyticEventQueue && this.analyticEventQueue.length > 0) {
                this.analyticEventQueue.forEach((events) => {
                    if (this.preloadWindow && !this.preloadWindow.isDestroyed()) {
                        this.preloadWindow.send(analyticCallback, events);
                    }
                });
            }
        }
    }

    /**
     * Sends the analytic events to the web client
     *
     * @param eventData {IAnalyticData}
     */
    public track(eventData: IAnalyticData): void {
        if (this.preloadWindow && !this.preloadWindow.isDestroyed()) {
            this.preloadWindow.send(analyticCallback, eventData);
            return;
        }
        this.analyticEventQueue.push(eventData);
        // don't store more than 100 msgs. keep most recent log msgs.
        if (this.analyticEventQueue.length > MAX_EVENT_QUEUE_LENGTH) {
            this.analyticEventQueue.shift();
        }
    }
}

const analytics = new Analytics();

export { analytics };
