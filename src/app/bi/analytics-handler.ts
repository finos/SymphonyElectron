import { app, WebContents } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../../common/logger';
import {
  AnalyticsElements,
  IAnalyticsData,
  ICrashData,
  InstallActionTypes,
  ISessionData,
  SDAUserSessionActionTypes,
} from './interface';

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
