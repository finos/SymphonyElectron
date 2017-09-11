'use strict';

const electron = require('electron');
const app = electron.app;
const childProcess = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { isMac, isDevEnv } = require('../utils/misc.js');
const log = require('../log.js');
const logLevels = require('../enums/logLevels.js');
const eventEmitter = require('.././eventEmitter');

// static ref to child process, only allow one screen snippet at time, so
// hold ref to prev, so can kill before starting next snippet.
let child;
let isAlwaysOnTop;

/**
 * Captures a user selected portion of the monitor and returns jpeg image
 * encoded in base64 format.
 */
class ScreenSnippet {
    /**
     * Returns promise.
     *
     * If successful will resolves with jpeg image encoded in base64 format:
     * {
     *     type: 'image/jpg;base64',
     *     data: base64-data
     * }
     *
     * Otherwise if not successful will reject with object
     * containing: { type: ['WARN','ERROR'], message: String }
     */
    capture() {
        return new Promise((resolve, reject) => {
            let captureUtil, captureUtilArgs;

            log.send(logLevels.INFO, 'ScreenSnippet: starting screen capture');

            let tmpFilename = 'symphonyImage-' + Date.now() + '.jpg';
            let tmpDir = os.tmpdir();

            let outputFileName = path.join(tmpDir, tmpFilename);

            if (isMac) {
                // utilize Mac OSX built-in screencapture tool which has been
                // available since OSX ver 10.2.
                captureUtil = '/usr/sbin/screencapture';
                captureUtilArgs = ['-i', '-s', '-t', 'jpg', outputFileName];
            } else {
                // use custom built windows screen capture tool
                if (isDevEnv) {
                    // for dev env pick up tool from node nodules
                    captureUtil =
                        path.join(__dirname,
                            '../../node_modules/screen-snippet/bin/Release/ScreenSnippet.exe');
                } else {
                    // for production gets installed next to exec.
                    let execPath = path.dirname(app.getPath('exe'));
                    captureUtil = path.join(execPath, 'ScreenSnippet.exe');
                }

                // Method to verify and disable always on top property
                // as an issue with the ScreenSnippet.exe not being on top
                // of the electron wrapper
                const windows = electron.BrowserWindow.getAllWindows();
                if (windows && windows.length > 0) {
                    isAlwaysOnTop = windows[ 0 ].isAlwaysOnTop();
                    if (isAlwaysOnTop) {
                        eventEmitter.emit('isAlwaysOnTop', false);
                    }
                }

                captureUtilArgs = [outputFileName];
            }

            log.send(logLevels.INFO, 'ScreenSnippet: starting screen capture util: ' + captureUtil + ' with args=' + captureUtilArgs);

            // only allow one screen capture at a time.
            if (child) {
                child.kill();
            }

            child = childProcess.execFile(captureUtil, captureUtilArgs, (error) => {
                // Method to reset always on top feature
                if (isAlwaysOnTop) {
                    eventEmitter.emit('isAlwaysOnTop', true);
                }
                // will be called when child process exits.
                if (error && error.killed) {
                    // processs was killed, just resolve with no data.
                    resolve();
                } else {
                    readResult.call(this, outputFileName, resolve, reject, error);
                }
            });
        });
    }
}

/**
 * this function was moved outside of class since class is exposed to web
 * client via preload API, we do NOT want web client to be able to call this
 * method - then they could read any file on the disk!
 * @param outputFileName
 * @param resolve
 * @param reject
 * @param childProcessErr
 */
function readResult(outputFileName, resolve, reject, childProcessErr) {
    fs.readFile(outputFileName, (readErr, data) => {
        if (readErr) {
            let returnErr;
            if (readErr.code === 'ENOENT') {
                // no such file exists, user likely aborted
                // creating snippet. also include any error when
                // creating child process.
                returnErr = createWarn('file does not exist ' +
                    childProcessErr);
            } else {
                returnErr = createError(readErr + ',' +
                    childProcessErr);
            }

            reject(returnErr);
            return;
        }

        if (!data) {
            reject(createWarn('no file data provided'));
            return;
        }

        try {
            // convert binary data to base64 encoded string
            let output = Buffer(data).toString('base64');
            resolve({
                type: 'image/jpg;base64',
                data: output
            });
        } catch (error) {
            reject(createError(error));
        } finally {
            // remove tmp file (async)
            fs.unlink(outputFileName, function(removeErr) {
                // note: node complains if calling async
                // func without callback.
                if (removeErr) {
                    log.send(logLevels.ERROR, 'ScreenSnippet: error removing temp snippet file: ' +
                        outputFileName + ', err:' + removeErr);
                }
            });
        }
    });
}

/* eslint-disable class-methods-use-this */
/**
 * Create an error object with the ERROR level
 * @param msg
 * @returns {Error}
 */
function createError(msg) {
    let err = new Error(msg);
    err.type = 'ERROR';
    return err;
}

/**
 * Create an error object with the WARN level
 * @param msg
 * @returns {Error}
 */
function createWarn(msg) {
    let err = new Error(msg);
    err.type = 'WARN';
    return err;
}
/* eslint-enable class-methods-use-this */

module.exports = {
    ScreenSnippet: ScreenSnippet,
    // note: readResult only exposed for testing purposes
    readResult: readResult
};