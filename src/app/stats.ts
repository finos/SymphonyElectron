import { app } from 'electron';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as si from 'systeminformation';

import { buildNumber, version } from '../../package.json';
import { logger } from '../common/logger';
import {
  analytics,
  AnalyticsElements,
  IAnalyticsData,
  ISessionData,
  SDAEndReasonTypes,
  SDAUserSessionActionTypes,
} from './analytics-handler';

const MAX_USAGE_CHECK_INTERVAL = 15 * 60 * 1000; // every 15min

export class AppStats {
  public startTime = new Date().toISOString();
  private MB_IN_BYTES = 1048576;
  private stats: IAnalyticsData[] = [];
  private statsEventsDataFilePath = path.join(
    app.getPath('userData'),
    'statsAnalytics.json',
  );
  private cpu: si.Systeminformation.CpuData | undefined;
  private mem: si.Systeminformation.MemData | undefined;
  private cpuUsage: si.Systeminformation.CurrentLoadData | undefined;
  private osInfo: si.Systeminformation.OsData | undefined;
  private uuid: si.Systeminformation.UuidData | undefined;
  private time: si.Systeminformation.TimeData | undefined;
  private maxMemoryUsed: number = 0;
  private maxCPUUsage: number = 0;

  /**
   * Logs all statistics of the app
   */
  public logStats() {
    this.logSystemStats();
    this.logProcessInfo();
    this.logGPUStats();
    this.logAppMetrics();
    this.logConfigurationData();
    this.logAppEvents();
    this.sendAnalytics(SDAUserSessionActionTypes.Start);
    setInterval(async () => {
      await this.retrieveLatestData();
    }, MAX_USAGE_CHECK_INTERVAL);
  }

  /**
   * Sends an analytics event
   * @private
   */
  public async sendAnalytics(
    actionType: SDAUserSessionActionTypes,
    endReason?: SDAEndReasonTypes,
    crashProcess: string = '',
  ) {
    console.time(`stats ${actionType}`);
    this.cpu = this.cpu ?? (await si.cpu());
    this.mem = this.mem ?? (await si.mem());
    this.cpuUsage = this.cpuUsage ?? (await si.currentLoad());
    this.osInfo = this.osInfo ?? (await si.osInfo());
    this.uuid = this.uuid ?? (await si.uuid());
    this.time = this.time ?? si.time();
    const totalMem = this.convertToMB(os.totalmem());
    const usedMem = this.convertToMB(this.mem.used);
    console.timeEnd(`stats ${actionType}`);
    const event: ISessionData = {
      element: AnalyticsElements.SDA_SESSION,
      action_type: actionType,
      extra_data: {
        sessionStartDatetime: this.startTime,
        machineStartDatetime: this.convertUptime(this.time.uptime),
        machineId: this.uuid.os,
        osName: os.platform(),
        osVersion: this.osInfo.release,
        osLanguage: app.getLocale(),
        cpuNumberOfCores: this.cpu.cores,
        cpuMaxFrequency: this.cpu.speedMax,
        cpuUsagePercent: Math.round(this.cpuUsage.currentLoad),
        maxCPUUsagePercent: this.maxCPUUsage,
        memoryTotal: this.convertToMB(os.totalmem()),
        memoryUsedPercent: this.calculatePercentage(usedMem, totalMem),
        maxMemoryUsedPercent: this.maxMemoryUsed,
        sdaUsedMemory: this.convertToMB(process.memoryUsage().heapUsed),
        memoryAvailable: this.convertToMB(this.mem.available),
        vdi: !!this.osInfo.hypervizor,
        endReason: endReason ? endReason : undefined,
        crashProcess,
      },
    };
    logger.info(`Analytics Track -> `, event);
    if (
      actionType === SDAUserSessionActionTypes.End ||
      actionType === SDAUserSessionActionTypes.Logout
    ) {
      this.stats.push(event);
    } else {
      analytics.track(event);
    }
  }

  /**
   * Writes all the pending stats into a file
   */
  public writeAnalyticFile = () => {
    try {
      fs.writeFileSync(
        this.statsEventsDataFilePath,
        JSON.stringify(this.stats, null, 2),
        { encoding: 'utf8' },
      );
      logger.info(
        `stats: updated stats values with the data ${JSON.stringify(
          this.stats,
        )}`,
      );
    } catch (error) {
      logger.error(
        `stats: failed to update stats with ${JSON.stringify(this.stats)}`,
        error,
      );
    }
  };

  /**
   * Sends all the locally stored stats
   */
  public sendLocalAnalytics = async () => {
    if (fs.existsSync(this.statsEventsDataFilePath)) {
      const localStats = fs.readFileSync(this.statsEventsDataFilePath, 'utf8');
      if (!localStats) {
        return;
      }
      let parsedStats: ISessionData[];
      try {
        parsedStats = JSON.parse(localStats);
        logger.info(`stats: parsed stats JSON file with data`, parsedStats);
        if (parsedStats && parsedStats.length) {
          parsedStats.forEach((event) => {
            analytics.track(event);
          });
          fs.unlinkSync(this.statsEventsDataFilePath);
        }
      } catch (e: any) {
        logger.error(`stats: parsing stats JSON file failed due to error ${e}`);
      }
    }
  };

  /**
   * Logs system related statistics
   */
  private logSystemStats() {
    logger.info(
      `-----------------Gathering system information-----------------`,
    );
    logger.info(`Network Info -> `, os.networkInterfaces());
    logger.info(`CPU Info -> `, os.cpus());
    logger.info(`Operating System -> `, os.type());
    logger.info(`Platform -> `, os.platform());
    logger.info(`Architecture -> `, os.arch());
    logger.info(`Hostname -> `, os.hostname());
    logger.info(`Temp Directory -> `, os.tmpdir());
    logger.info(`Home Directory -> `, os.homedir());
    logger.info(`Total Memory (MB) -> `, os.totalmem() / this.MB_IN_BYTES);
    logger.info(`Free Memory (MB) -> `, os.freemem() / this.MB_IN_BYTES);
    logger.info(`Load Average -> `, os.loadavg());
    let uptime = 0;
    try {
      uptime = os.uptime();
    } catch (error) {
      logger.error('stats: Error getting machine uptime', error);
    }
    logger.info(`Uptime -> `, uptime);
    logger.info(`User Info (OS Returned) -> `, os.userInfo());
  }

  /**
   * Logs GPU Statistics
   */
  private logGPUStats() {
    logger.info(`-----------------Gathering GPU information-----------------`);
    logger.info(`GPU Feature Status -> `, app.getGPUFeatureStatus());
  }

  /**
   * Logs Configuration Data
   */
  private logConfigurationData() {
    logger.info(
      `-----------------App Configuration Information-----------------`,
    );
    logger.info(`stats: Is app packaged? ${app.isPackaged}`);
  }

  /**
   * Logs App metrics
   */
  private logAppMetrics() {
    logger.info(`-----------------Gathering App Metrics-----------------`);
    const metrics = app.getAppMetrics();
    metrics.forEach((metric) => {
      logger.info(
        `stats: PID -> ${metric.pid}, Type -> ${metric.type}, CPU Usage -> `,
        metric.cpu,
      );
    });
  }

  /**
   * Logs App events as they occur dynamically
   */
  private logAppEvents() {
    const events = [
      'will-finish-launching',
      'ready',
      'window-all-closed',
      'before-quit',
      'will-quit',
      'quit',
      'open-file',
      'open-url',
      'activate',
      'browser-window-created',
      'web-contents-created',
      'certificate-error',
      'login',
      'gpu-process-crashed',
      'accessibility-support-changed',
      'session-created',
      'second-instance',
    ];

    events.forEach((appEvent: any) => {
      app.on(appEvent, () => {
        logger.info(`stats: App Event Occurred: ${appEvent}`);
      });
    });
  }

  /**
   * Logs process info
   */
  private logProcessInfo() {
    logger.info(`-----------------Gathering Process Info-----------------`);
    logger.info(`stats: Is default app? ${process.defaultApp}`);
    logger.info(`stats: Is Mac Store app? ${process.mas}`);
    logger.info(`stats: Is Windows Store app? ${process.windowsStore}`);
    logger.info(`stats: Resources Path? ${process.resourcesPath}`);
    logger.info(`stats: Chrome Version? ${process.versions.chrome}`);
    logger.info(`stats: Electron Version? ${process.versions.electron}`);
    logger.info(`stats: SDA Version? ${version} (${buildNumber})`);
  }

  /**
   * Calculates percentage
   * @param value
   * @param total
   * @private
   */
  private calculatePercentage(value: number = 0, total: number = 0): number {
    return Math.round((value / total) * 100);
  }

  /**
   * Converts and fixes number
   * @param value
   * @private
   */
  private convertToMB(value: number = 0): number {
    return Math.round(value / this.MB_IN_BYTES);
  }

  /**
   * Converts time to datetime
   * @param uptime
   * @private
   */
  private convertUptime(uptime): string {
    if (!uptime) {
      return '';
    }
    const uptimeDatetime = new Date(Date.now() - uptime * 1000);
    return uptimeDatetime.toISOString();
  }

  /**
   * Captures the max CPU & Memory value
   * @private
   */
  private async retrieveLatestData(): Promise<void> {
    this.mem = await si.mem();
    this.cpu = await si.cpu();
    this.cpuUsage = await si.currentLoad();

    const cpuUsagePercent = Math.round(this.cpuUsage.currentLoad);
    const totalMem = this.convertToMB(os.totalmem());
    const usedMem = this.convertToMB(this.mem.used);
    const memUsedPercentage = this.calculatePercentage(usedMem, totalMem);
    if (memUsedPercentage > this.maxMemoryUsed) {
      this.maxMemoryUsed = memUsedPercentage;
    }
    if (cpuUsagePercent > this.maxCPUUsage) {
      this.maxCPUUsage = cpuUsagePercent;
    }
  }
}

const appStats = new AppStats();

export { appStats };
