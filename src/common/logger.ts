import { app, BrowserWindow } from 'electron';
import electronLog, { ILogLevel as LogLevel, transports } from 'electron-log';
import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';

import { isElectronQA, isWindowsOS } from './env';
import { getCommandLineArgs } from './utils';

export interface ILogMsg {
    level: LogLevel;
    details: any;
    showInConsole: boolean;
    startTime: number;
}

interface IClientLogMsg {
    msgs?: ILogMsg[];
    logLevel?: LogLevel;
    showInConsole?: boolean;
}

const MAX_LOG_QUEUE_LENGTH = 100;

if (isWindowsOS && process.env.LOCALAPPDATA) {
    app.setPath('appData', process.env.LOCALAPPDATA);
    app.setPath('userData', path.join(app.getPath('appData'), app.getName()));

    // We need to create the logs directory manually because
    // Electron 3.1.x doesn't support this
    const logPath = path.join(app.getPath('appData'), app.getName(), 'logs');
    if (!fs.existsSync(logPath) && !isElectronQA) {
        fs.mkdirSync(logPath, { recursive: true });
    }
    app.setPath('logs', logPath);
}

class Logger {
    private readonly showInConsole: boolean = false;
    private readonly desiredLogLevel?: LogLevel;
    private readonly logQueue: ILogMsg[];
    private readonly logPath: string;
    private loggerWindow: Electron.WebContents | null;

    constructor() {

        this.loggerWindow = null;
        this.logQueue = [];
        // If the user has specified a custom log path use it.
        const customLogPathArg = getCommandLineArgs(process.argv, '--logPath=', false);
        const customLogsFolder = customLogPathArg && customLogPathArg.substring(customLogPathArg.indexOf('=') + 1);
        if (customLogsFolder && fs.existsSync(customLogsFolder)) {
            app.setPath('logs', customLogsFolder);
        }

        this.logPath = app.getPath('logs');

        if (app.isPackaged) {
            transports.file.file = path.join(this.logPath, `app_${Date.now()}.log`);
            transports.file.level = 'debug';
            transports.file.format = '{y}-{m}-{d} {h}:{i}:{s}:{ms} {z} | {level} | {text}';
            transports.file.appName = 'Symphony';
        }

        const logLevel = getCommandLineArgs(process.argv, '--logLevel=', false);
        if (logLevel) {
            const level = logLevel.split('=')[1];
            if (level) {
                this.desiredLogLevel = level as LogLevel;
            }
        }

        if (getCommandLineArgs(process.argv, '--enableConsoleLogging', false)) {
            this.showInConsole = true;
        }

        // cleans up old logs if there are any
        this.cleanupOldLogs();
    }

    /**
     * get instance of logQueue
     */
    public getLogQueue(): ILogMsg[] {
        return this.logQueue;
    }

    /**
     * Log error
     *
     * @param message {string} - message to be logged
     * @param data {any} - extra data that needs to be logged
     */
    public error(message: string, ...data: any[]): void {
        this.log('error', message, data);
    }

    /**
     * Log warn
     *
     * @param message {string} - message to be logged
     * @param data {any} - extra data that needs to be logged
     */
    public warn(message: string, ...data: any[]): void {
        this.log('warn', message, data);
    }

    /**
     * Log info
     *
     * @param message {string} - message to be logged
     * @param data {any} - extra data that needs to be logged
     */
    public info(message: string, ...data: any[]): void {
        this.log('info', message, data);
    }

    /**
     * Log verbose
     *
     * @param message {string} - message to be logged
     * @param data {array} - extra data that needs to be logged
     */
    public verbose(message: string, ...data: any[]): void {
        this.log('verbose', message, data);
    }

    /**
     * Log debug
     *
     * @param message {string} - message to be logged
     * @param data {any} - extra data that needs to be logged
     */
    public debug(message: string, ...data: any[]): void {
        this.log('debug', message, data);
    }

    /**
     * Log silly
     *
     * @param message {string} - message to be logged
     * @param data {any} - extra data that needs to be logged
     */
    public silly(message: string, ...data: any[]): void {
        this.log('silly', message, data);
    }

    /**
     * Sets the renderer window for sending logs to the client
     *
     * @param window {WebContents} - renderer window
     */
    public setLoggerWindow(window: Electron.WebContents): void {
        this.loggerWindow = window;

        if (this.loggerWindow) {
            const logMsgs: IClientLogMsg = {};
            if (this.logQueue.length) {
                logMsgs.msgs = this.logQueue;
            }
            if (this.desiredLogLevel) {
                logMsgs.logLevel = this.desiredLogLevel;
            }
            if (Object.keys(logMsgs).length) {
                this.loggerWindow.send('log', logMsgs);
            }
        }
    }

    /**
     * Main instance of the logger method
     *
     * @param logLevel {LogLevel} - Different type of log levels
     * @param message {string} - Log message
     * @param data {array} - extra data to be logged
     */
    private log(logLevel: LogLevel, message: string, data: any[] = []): void {
        if (data && data.length > 0) {
            data.forEach((param) => {
                message += `, '${param && typeof param}': ${JSON.stringify(param)}`;
            });
        }
        if (!isElectronQA) {
            switch (logLevel) {
                case 'error': electronLog.error(message); break;
                case 'warn': electronLog.warn(message); break;
                case 'info': electronLog.info(message); break;
                case 'verbose': electronLog.verbose(message); break;
                case 'debug': electronLog.debug(message); break;
                case 'silly': electronLog.silly(message); break;
                default: electronLog.info(message);
            }
        }
        this.sendToCloud(this.formatLogMsg(logLevel, message));
    }

    /**
     * Formats the logs in the format that required
     * to send to the client
     *
     * @param level {LogLevel} - Different type of log levels
     * @param details {any} - log format that required to send to client
     */
    private formatLogMsg(level: LogLevel, details: any): ILogMsg {
        return {
            details,
            level,
            showInConsole: this.showInConsole,
            startTime: Date.now(),
        };
    }

    /**
     * This will send the logs to the client if loggerWindow
     * else adds the logs to a Queue
     *
     * @param logMsg {ILogMsg}
     */
    private sendToCloud(logMsg: ILogMsg): void {
        // don't send logs if it is not desired by the user
        if (this.desiredLogLevel && this.desiredLogLevel !== logMsg.level) {
            return;
        }

        if (this.loggerWindow) {
            const browserWindow = BrowserWindow.fromWebContents(this.loggerWindow);
            if (!(!!browserWindow && typeof browserWindow.isDestroyed === 'function' && !browserWindow.isDestroyed())) {
                return;
            }
            this.loggerWindow.send('log', { msgs: [ logMsg ], logLevel: this.desiredLogLevel, showInConsole: this.showInConsole });
            return;
        }

        this.logQueue.push(logMsg);
        // don't store more than 100 msgs. keep most recent log msgs.
        if (this.logQueue.length > MAX_LOG_QUEUE_LENGTH) {
            this.logQueue.shift();
        }
    }

    /**
     * Cleans up logs older than a day
     */
    private cleanupOldLogs(): void {
        if (!fs.existsSync(this.logPath)) {
            return;
        }
        const files = fs.readdirSync(this.logPath);
        const deleteTimeStamp = new Date().getTime() + (10 * 24 * 60 * 60 * 1000);
        files.forEach((file) => {
            if (file === '.DS_Store' || file === 'app.log') {
                return;
            }
            const filePath = path.join(this.logPath, file);
            const stat = fs.statSync(filePath);
            const fileTimestamp = new Date(util.inspect(stat.mtime)).getTime();
            if (fileTimestamp > deleteTimeStamp) {
                fs.unlinkSync(filePath);
            }
        });
    }
}

const logger = new Logger();

export { logger };
