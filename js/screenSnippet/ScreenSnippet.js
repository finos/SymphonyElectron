'use strict';

const childProcess = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { isMac } = require('../utils/misc.js');

// static ref to child process, only allow one screen snippet at time, so
// hold ref to prev, so can kill before starting next snippet.
let child;

/**
 * Captures a user selected portion of the monitor and returns jpeg image
 * encoded in base64 format.
 */
class ScreenSnippet {
    /**
     * Returns promise. If successful will resolve with jpeg image encoded in
     * base64 format. Otherwise if not successful will reject with object
     * containing: { type: ['WARN','ERROR'], message: String }
     */
    capture() {
        return new Promise((resolve, reject) => {
            let captureUtil, captureUtilArgs;

            let tmpFilename = 'symphonyImage-' + Date.now() + '.jpg';
            let tmpDir = os.tmpdir();

            let outputFileName = path.join(tmpDir, tmpFilename);

            if (isMac) {
                // utilize Mac OSX built-in screencapture tool which has been
                // available since OSX ver 10.2.
                captureUtil = '/usr/sbin/screencapture';
                captureUtilArgs = [ '-i', '-s', '-t', 'jpg', outputFileName ];
            } else {
                // for now screen snippet on windows is not supported,
                // waiting on open sourcing for custom screen snippter util.
                reject(this._createWarn('windows not supported'));
                // custom built windows screen capture tool, that is
                // located in same directory as running exec.
                //captureUtil = './ScreenSnippet.exe';
                //captureUtilArgs = [ outputFileName ];
            }

            // only allow one screen capture at a time.
            if (child) {
                child.kill();
            }

            child = childProcess.execFile(captureUtil, captureUtilArgs, (error) => {
                // will be called when child process exits.
                if (error && error.killed) {
                    // processs was killed, just resolve with no data.
                    resolve();
                } else {
                    this._readResult(outputFileName, resolve, reject, error);
                }
            });
        });
    }

    // private methods below here

    _readResult(outputFileName, resolve, reject, childProcessErr) {
        fs.readFile(outputFileName, (readErr, data) => {
            if (readErr) {
                let returnErr;
                if (readErr.code === 'ENOENT') {
                    // no such file exists, user likely aborted
                    // creating snippet. also include any error when
                    // creating child process.
                    returnErr = this._createWarn('file does not exist ' +
                        childProcessErr);
                } else {
                    returnErr = this._createError(readErr + ',' +
                        childProcessErr);
                }

                reject(returnErr);
                return;
            }

            if (!data) {
                reject(this._createWarn('no file data provided'));
                return;
            }

            try {
                // convert binary data to base64 encoded string
                let output = Buffer(data).toString('base64');
                resolve(output);
            } catch (error) {
                reject(this._createError(error));
            }
            finally {
                // remove tmp file (async)
                fs.unlink(outputFileName, function(removeErr) {
                    // note: node complains if calling async
                    // func without callback.
                    /* eslint-disable no-console */
                    if (removeErr) {
                        console.error(
                            'error removing temp snippet file: ' +
                            outputFileName + ', err:' + removeErr);
                    }
                    /* eslint-enable no-console */
                });
            }
        });

    }

    /* eslint-disable class-methods-use-this */
    _createError(msg) {
        var err = new Error(msg);
        err.type = 'ERROR';
        return err;
    }

    _createWarn(msg) {
        var err = new Error(msg);
        err.type = 'WARN';
        return err;
    }
    /* eslint-enable class-methods-use-this */
}

module.exports = ScreenSnippet;
