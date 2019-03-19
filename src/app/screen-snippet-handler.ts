import { app } from 'electron';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { ChildProcess, ExecException, execFile } from 'child_process';
import * as util from 'util';
import { IScreenSnippet } from '../common/api-interface';
import { isDevEnv, isMac } from '../common/env';
import { i18n } from '../common/i18n';
import { logger } from '../common/logger';
import { updateAlwaysOnTop } from './window-actions';
import { windowHandler } from './window-handler';

const readFile = util.promisify(fs.readFile);

class ScreenSnippet {
    private readonly tempDir: string;
    private readonly captureUtil: string;
    private outputFileName: string | undefined;
    private isAlwaysOnTop: boolean;
    private captureUtilArgs: ReadonlyArray<string> | undefined;
    private child: ChildProcess | undefined;

    constructor() {
        this.tempDir = os.tmpdir();
        this.isAlwaysOnTop = false;
        if (isMac) {
            this.captureUtil = '/usr/sbin/screencapture';
        } else {
            this.captureUtil = isDevEnv
                ? path.join(__dirname,
                    '../../node_modules/screen-snippet/bin/Release/ScreenSnippet.exe')
                : path.join(path.dirname(app.getPath('exe')), 'ScreenSnippet.exe');
        }
    }

    /**
     * Captures a user selected portion of the monitor and returns jpeg image
     * encoded in base64 format.
     *
     * @param webContents {Electron.webContents}
     */
    public async capture(webContents: Electron.webContents) {
        this.outputFileName = path.join(this.tempDir, 'symphonyImage-' + Date.now() + '.jpg');
        this.captureUtilArgs = isMac
            ? [ '-i', '-s', '-t', 'jpg', this.outputFileName ]
            : [ this.outputFileName, i18n.getLocale() ];

        const mainWindow = windowHandler.getMainWindow();
        if (mainWindow) {
            this.isAlwaysOnTop = mainWindow.isAlwaysOnTop();
            updateAlwaysOnTop(false, false);
        }
        // only allow one screen capture at a time.
        if (this.child) {
            this.child.kill();
        }
        try {
            await this.execCmd(this.captureUtil, this.captureUtilArgs);
            const { message, data, type }: IScreenSnippet = await this.convertFileToData();
            webContents.send('screen-snippet-data', { message, data, type });
        } catch (error) {
            logger.error(`screen-snippet: screen snippet process was killed`, error);
        }
    }

    /**
     * Kills the child process when the application is reloaded
     */
    public killChildProcess(): void {
        if (this.child && typeof this.child.kill === 'function') {
            this.child.kill();
        }
    }

    /**
     * Executes the given command via a child process
     *
     * Windows: uses custom built windows screen capture tool
     * Mac OSX: uses built-in screencapture tool which has been
     * available since OSX ver 10.2.
     *
     * @param captureUtil {string}
     * @param captureUtilArgs {captureUtilArgs}
     * @example execCmd('-i -s', '/user/desktop/symphonyImage-1544025391698.jpg')
     */
    private execCmd(captureUtil: string, captureUtilArgs: ReadonlyArray<string>): Promise<ChildProcess> {
        return new Promise<ChildProcess>((resolve, reject) => {
            return this.child = execFile(captureUtil, captureUtilArgs, (error: ExecException | null) => {
                if (this.isAlwaysOnTop) {
                    updateAlwaysOnTop(true, false);
                }
                if (error && error.killed) {
                    // processs was killed, just resolve with no data.
                    return reject(error);
                }
                resolve();
            });
        });
    }

    /**
     * Converts the temporary stored file into base64
     * and removes the temp file
     *
     * @return Promise<IScreenSnippet> { message, data, type }
     */
    private async convertFileToData(): Promise<IScreenSnippet> {
        try {
            if (!this.outputFileName) {
                return { message: 'output file name is required', type: 'ERROR' };
            }
            const data = await readFile(this.outputFileName);
            if (!data) {
                return { message: `no file data provided`, type: 'ERROR' };
            }
            // convert binary data to base64 encoded string
            const output = Buffer.from(data).toString('base64');
            return { message: 'success', data: output, type: 'image/jpg;base64' };
        } catch (error) {
            if (error && error.code === 'ENOENT') {
                // no such file exists, user likely aborted
                // creating snippet. also include any error when
                // creating child process.
                return { message: `file does not exist`, type: 'ERROR' };
            } else {
                return { message: `${error}`, type: 'ERROR' };
            }
        } finally {
            // remove tmp file (async)
            if (this.outputFileName) {
                fs.unlink(this.outputFileName, (removeErr) => {
                    // note: node complains if calling async
                    // func without callback.
                    if (removeErr) {
                        logger.error(`ScreenSnippet: error removing temp snippet file: ${this.outputFileName}, err: ${removeErr}`);
                    }
                });
            }
        }
    }
}

const screenSnippet = new ScreenSnippet();

export { screenSnippet };