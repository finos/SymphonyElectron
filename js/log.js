'use strict';

const getCmdLineArg = require('./utils/getCmdLineArg.js')

const MAX_LOG_QUEUE_LENGTH = 100;

class Logger {
    constructor() {
        // browser window that has registered a logger
        this.logWindow = null;

        // holds log messages received before logger has been registered.
        this.logQueue = [];
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

    setLogWindow(win) {
        this.logWindow = win;

        if (this.logWindow) {
            var logMsg = {};

            if (Array.isArray(this.logQueue)) {
                logMsg.msgs = this.logQueue;
            }

            // configure desired log level and send pending log msgs
            let logLevel = getCmdLineArg(process.argv, '--logLevel=');
            if (logLevel) {
                let level = logLevel.split('=')[1];
                if (level) {
                    logMsg.logLevel = level;
                }
            }

            if (getCmdLineArg(process.argv, '--enableConsoleLogging')) {
                logMsg.showInConsole = true;
            }

            if (Object.keys(logMsg).length) {
                this.logWindow.send('log', logMsg);
            }

            this.logQueue = [];
        }
    }
}

var loggerInstance = new Logger();

// Logger class is only exposed for testing purposes.
module.exports = {
    Logger: Logger,
    send: loggerInstance.send.bind(loggerInstance),
    setLogWindow: loggerInstance.setLogWindow.bind(loggerInstance)
}
