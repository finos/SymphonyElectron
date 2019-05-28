import { app } from 'electron';
import * as os from 'os';
import { logger } from '../common/logger';
import { config } from './config-handler';

export class AppStats {

    private MB_IN_BYTES = 1048576;

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
    }

    /**
     * Logs system related statistics
     */
    private logSystemStats() {
        logger.info(`stats: -----------------Gathering system information-----------------`);
        logger.info( `Network Info -> `, os.networkInterfaces());
        logger.info( `CPU Info -> `, os.cpus());
        logger.info( `Operating System -> `, os.type());
        logger.info( `Platform -> `, os.platform());
        logger.info( `Architecture -> `, os.arch());
        logger.info( `Hostname -> `, os.hostname());
        logger.info( `Temp Directory -> `, os.tmpdir());
        logger.info( `Home Directory -> `, os.homedir());
        logger.info( `Total Memory (MB) -> `, os.totalmem() / this.MB_IN_BYTES);
        logger.info( `Free Memory (MB) -> `, os.freemem() / this.MB_IN_BYTES);
        logger.info( `Load Average -> `, os.loadavg());
        logger.info( `Uptime -> `, os.uptime());
        logger.info( `User Info (OS Returned) -> `, os.userInfo());
    }

    /**
     * Logs GPU Statistics
     */
    private logGPUStats() {
        logger.info( `-----------------Gathering GPU information-----------------`);
        logger.info( `GPU Feature Status -> `, app.getGPUFeatureStatus());
    }

    /**
     * Logs Configuration Data
     */
    private logConfigurationData() {
        const configItems = [
            'url', 'minimizeOnClose', 'launchOnStartup', 'alwaysOnTop', 'bringToFront', 'whitelistUrl',
            'isCustomTitleBar', 'memoryRefresh', 'devToolsEnabled', 'ctWhitelist', 'configVersion',
            'buildNumber', 'autoLaunchPath', 'notificationSettings', 'permissions', 'customFlags',
            'crashReporter', 'mainWinPos',
        ];

        logger.info(`stats: -----------------App Configuration Information-----------------`);
        logger.info(`stats: Is app packaged? ${app.isPackaged}`);

        const globalConfiguration = config.getGlobalConfigFields(configItems);
        logger.info(`stats: Global configuration: `, globalConfiguration);

        const userConfiguration = config.getUserConfigFields(configItems);
        logger.info(`stats: -----------------Gathering User Configuration Information-----------------`);
        logger.info(`stats: User configuration: `, userConfiguration);
    }

    /**
     * Logs App metrics
     */
    private logAppMetrics() {
        logger.info(`stats: -----------------Gathering App Metrics-----------------`);
        const metrics = app.getAppMetrics();
        metrics.forEach((metric) => {
            logger.info(`stats: PID -> ${metric.pid}, Type -> ${metric.type}, CPU Usage -> `, metric.cpu);
        });
    }

    /**
     * Logs App events as they occur dynamically
     */
    private logAppEvents() {
        const events = [
            'will-finish-launching', 'ready', 'window-all-closed', 'before-quit', 'will-quit', 'quit',
            'open-file', 'open-url', 'activate',
            'browser-window-created', 'web-contents-created', 'certificate-error', 'login', 'gpu-process-crashed',
            'accessibility-support-changed', 'session-created', 'second-instance',
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
        logger.info(`stats: Is default app? ${process.defaultApp}`);
        logger.info(`stats: Is Mac Store app? ${process.mas}`);
        logger.info(`stats: Is Windows Store app? ${process.windowsStore}`);
        logger.info(`stats: Resources Path? ${process.resourcesPath}`);
        logger.info(`stats: Sandboxed? ${process.sandboxed}`);
        logger.info(`stats: Chrome Version? ${process.versions.chrome}`);
        logger.info(`stats: Electron Version? ${process.versions.electron}`);
    }

}

const appStats = new AppStats();

export {
    appStats,
};
