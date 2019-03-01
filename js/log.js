'use strict';

const fs = require('fs');
const util = require('util');

const { app } = require('electron');
const path = require('path');
const getCmdLineArg = require('./utils/getCmdLineArg.js');
const logLevels = require('./enums/logLevels.js');

const MAX_LOG_QUEUE_LENGTH = 100;

let electronLog;

class Logger {

    constructor() {
        // browser window that has registered a logger
        this.logWindow = null;

        // holds log messages received before logger has been registered.
        this.logQueue = [];

        // Initializes the local logger
        if (!process.env.ELECTRON_QA) {
            initializeLocalLogger();
        }
    }

    /**
     * Send log messages from main process to logger hosted by
     * renderer process. Allows main process to use logger
     * provided by JS.
     * @param  {enum} level      enum from ./enums/LogLevel.js
     * @param  {string} details  msg to be logged
     */
    send(level, details) {
        if (!level || !details) {
            return;
        }

        if (!process.env.ELECTRON_QA) {
            logLocally(level, details);
        }

        let logMsg = {
            level: level,
            details: details,
            startTime: Date.now()
        };

        if (this.logWindow) {
            this.logWindow.send('log', {
                msgs: [ logMsg ]
            });
        } else {
            // store log msgs for later when (if) we get logger registered
            this.logQueue.push(logMsg);
            // don't store more than 100 msgs. keep most recent log msgs.
            if (this.logQueue.length > MAX_LOG_QUEUE_LENGTH) {
                this.logQueue.shift();
            }
        }
    }

    /**
     * Sets a window instance for the remote object
     * @param win
     */
    setLogWindow(win) {
        this.logWindow = win;

        if (this.logWindow) {
            let logMsg = {};

            if (Array.isArray(this.logQueue)) {
                logMsg.msgs = this.logQueue;
            }

            // configure desired log level and send pending log msgs
            let logLevel = getCmdLineArg(process.argv, '--logLevel=', false);
            if (logLevel) {
                let level = logLevel.split('=')[1];
                if (level) {
                    logMsg.logLevel = level;
                }
            }

            if (getCmdLineArg(process.argv, '--enableConsoleLogging', false)) {
                logMsg.showInConsole = true;
            }

            if (Object.keys(logMsg).length) {
                this.logWindow.send('log', logMsg);
            }

            this.logQueue = [];
        }
    }
}

let loggerInstance = new Logger();

/**
 * Initializes the electron logger for local logging
 */
function initializeLocalLogger() {

    // If the user has specified a custom log path use it.
    let customLogPathArg = getCmdLineArg(process.argv, '--logPath=', false);
    let customLogsFolder = customLogPathArg && customLogPathArg.substring(customLogPathArg.indexOf('=') + 1);

    if (customLogsFolder && fs.existsSync(customLogsFolder)) {
        app.setPath('logs', customLogsFolder);
    }
    // eslint-disable-next-line global-require
    electronLog = require('electron-log');
    const logPath = app.getPath('logs');
    cleanupOldLogs(logPath);
    electronLog.transports.file.file = path.join(logPath, `app_${Date.now()}.log`);
    electronLog.transports.file.level = 'debug';
    electronLog.transports.file.format = '{y}-{m}-{d} {h}:{i}:{s}:{ms} {z} | {level} | {text}';
    electronLog.transports.file.appName = 'Symphony';
}

/**
 * Cleans up old log files in the given path
 * @param {String} logPath Path of the log files
 */
function cleanupOldLogs(logPath) {
    let files = fs.readdirSync(logPath);
    const deleteTimeStamp = new Date().getTime() + (10 * 24 * 60 * 60 * 1000);
    files.forEach((file) => {
        if (file === '.DS_Store' || file === 'app.log') {
            return;
        }
        const filePath = path.join(logPath, file);
        const stat = fs.statSync(filePath);
        const fileTimestamp = new Date(util.inspect(stat.mtime)).getTime();
        if (fileTimestamp > deleteTimeStamp) {
            fs.unlinkSync(filePath);
        }
    });
}

/**
 * Logs locally using the electron-logger
 * @param level
 * @param message
 */
function logLocally(level, message) {
    switch (level) {
        case logLevels.ERROR: electronLog.error(message); break;
        case logLevels.CONFLICT: electronLog.error(message); break;
        case logLevels.WARN: electronLog.warn(message); break;
        case logLevels.ACTION: electronLog.warn(message); break;
        case logLevels.INFO: electronLog.info(message); break;
        case logLevels.DEBUG: electronLog.debug(message); break;
        default: electronLog.debug(message);
    }
}

// Logger class is only exposed for testing purposes.
module.exports = {
    Logger: Logger,
    send: loggerInstance.send.bind(loggerInstance),
    setLogWindow: loggerInstance.setLogWindow.bind(loggerInstance)
};
