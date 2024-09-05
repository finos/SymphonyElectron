import { app } from 'electron';
import * as os from 'os';

import { buildNumber, version } from '../../package.json';
import { logger } from '../common/logger';
import { analytics } from './bi/analytics-handler';
import {
  AnalyticsElements,
  ISessionData,
  SDAEndReasonTypes,
  SDAUserSessionActionTypes,
} from './bi/interface';

const MAX_USAGE_CHECK_INTERVAL = 15 * 60 * 1000; // every 15min

export class AppStats {
  public startTime = new Date().toISOString();
  private MB_IN_BYTES = 1048576;
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
    const totalMem = this.convertToMB(os.totalmem());
    const freeMem = this.convertToMB(os.freemem());
    const usedMem = totalMem - freeMem;
    const cpuUsagePercentage = await this.getCPUUsage();
    console.timeEnd(`stats ${actionType}`);
    const event: ISessionData = {
      element: AnalyticsElements.SDA_SESSION,
      action_type: actionType,
      extra_data: {
        sessionStartDatetime: this.startTime,
        machineStartDatetime: this.convertUptime(os.uptime()),
        machineId: '',
        osName: os.platform(),
        osVersion: os.release(),
        osLanguage: app.getLocale(),
        cpuNumberOfCores: os.cpus().length,
        cpuMaxFrequency: this.getMaxCPUSpeed(),
        cpuUsagePercent: cpuUsagePercentage,
        maxCPUUsagePercent: this.maxCPUUsage,
        memoryTotal: this.convertToMB(os.totalmem()),
        memoryUsedPercent: this.calculatePercentage(usedMem, totalMem),
        maxMemoryUsedPercent: this.maxMemoryUsed,
        sdaUsedMemory: this.convertToMB(process.memoryUsage().heapUsed),
        memoryAvailable: totalMem,
        vdi: false,
        endReason: endReason ? endReason : undefined,
        crashProcess,
      },
    };
    logger.info(`Analytics Track -> `, event);
    analytics.track(event);
  }

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
   * Gets the maximum CPU speed in MHz.
   *
   * @returns {number} The maximum CPU speed in MHz.
   */
  private getMaxCPUSpeed(): number {
    return Math.max(...os.cpus().map((cpu) => cpu.speed)) / 1000;
  }

  /**
   * Calculates the average CPU usage across all cores.
   * @returns {{ idle: number, total: number }} An object
   */
  private calculateCPUUsage(): { idle: number; total: number } {
    const cpus = os.cpus();

    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach((cpu) => {
      const { user, nice, sys, idle, irq } = cpu.times;
      totalIdle += idle;
      totalTick += user + nice + sys + idle + irq;
    });

    return { idle: totalIdle / cpus.length, total: totalTick / cpus.length };
  }

  /**
   * Calculates the average CPU usage over a 1-second interval.
   *
   * @returns {Promise<string>} A promise that resolves to a string representing
   * the CPU usage percentage, formatted to two decimal places.
   */
  private getCPUUsage(): Promise<number> {
    return new Promise((resolve) => {
      const start = this.calculateCPUUsage();

      // Wait for 1 second and then calculate the CPU usage
      setTimeout(() => {
        const end = this.calculateCPUUsage();
        const idleDiff = end.idle - start.idle;
        const totalDiff = end.total - start.total;
        const usage = 100 - (100 * idleDiff) / totalDiff;

        resolve(parseInt(usage.toFixed(2), 10));
      }, 1000);
    });
  }

  /**
   * Captures the max CPU & Memory value
   * @private
   */
  private async retrieveLatestData(): Promise<void> {
    const cpuUsagePercent = await this.getCPUUsage();
    const totalMem = this.convertToMB(os.totalmem());
    const freeMem = this.convertToMB(os.freemem());
    const usedMem = totalMem - freeMem;
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
