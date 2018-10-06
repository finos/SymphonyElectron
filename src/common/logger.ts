import { app } from 'electron';
import electronLog, { LogLevel, transports } from 'electron-log';
import * as path from 'path';

import getCmdLineArg from './get-command-line-args';
import { isElectronQA } from './mics';
import stringFormat from './string-format';

interface ILogMsg {
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

export class Logger {
    private readonly showInConsole: boolean = false;
    private readonly desiredLogLevel?: LogLevel;
    private readonly logQueue: ILogMsg[];
    private loggerWindow: Electron.WebContents | null;

    constructor() {
        this.loggerWindow = null;
        this.logQueue = [];
        if (!isElectronQA) {
            transports.file.file = path.join(app.getPath('logs'), 'app.log');
            transports.file.level = 'debug';
            transports.file.format = '{h}:{i}:{s}:{ms} {text}';
            transports.file.maxSize = 10 * 1024 * 1024;
            transports.file.appName = 'Symphony';
        }

        const logLevel = getCmdLineArg(process.argv, '--logLevel=', false);
        if (logLevel) {
            const level = logLevel.split('=')[1];
            if (level) {
                this.desiredLogLevel = level as LogLevel;
            }
        }

        if (getCmdLineArg(process.argv, '--enableConsoleLogging', false)) {
            this.showInConsole = true;
        }
    }

    public error(message: string, data?: object): void {
        this.log('error', message, data);
    }

    public warn(message: string, data?: object): void {
        this.log('warn', message, data);
    }

    public info(message: string, data?: object): void {
        this.log('info', message, data);
    }

    public verbose(message: string, data?: object): void {
        this.log('verbose', message, data);
    }

    public debug(message: string, data?: object): void {
        this.log('debug', message, data);
    }

    public silly(message: string, data?: object): void {
        this.log('silly', message, data);
    }

    public setLoggerWindow(window: Electron.WebContents): void {
        this.loggerWindow = window;

        if (this.loggerWindow) {
            const logMsgs: IClientLogMsg = {};
            if (this.logQueue.length) logMsgs.msgs = this.logQueue;
            if (this.desiredLogLevel) logMsgs.logLevel = this.desiredLogLevel;
            if (Object.keys(logMsgs).length) this.loggerWindow.send('log', logMsgs);
        }
    }

    private log(logLevel: LogLevel, message: string, data?: object): void {
        message = stringFormat(message, data);
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
    private sendToCloud(logMsg: ILogMsg) {
        // don't send logs if it is not desired by the user
        if (this.desiredLogLevel && this.desiredLogLevel !== logMsg.level) {
            return;
        }

        if (this.loggerWindow) {
            this.loggerWindow.send('log', { msgs: [ logMsg ] });
        } else {
            this.logQueue.push(logMsg);
            // don't store more than 100 msgs. keep most recent log msgs.
            if (this.logQueue.length > MAX_LOG_QUEUE_LENGTH) {
                this.logQueue.shift();
            }
        }
    }
}

const logger = new Logger();

export {
    logger,
};