import { app, BrowserWindow, clipboard, ipcMain, nativeImage } from 'electron';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { ChildProcess, ExecException, execFile } from 'child_process';
import * as util from 'util';
import { IScreenSnippet } from '../common/api-interface';
import {
  isDevEnv,
  isElectronQA,
  isLinux,
  isMac,
  isWindowsOS,
} from '../common/env';
import { i18n } from '../common/i18n';
import { logger } from '../common/logger';
import {
  analytics,
  AnalyticsElements,
  ScreenSnippetActionTypes,
} from './analytics-handler';
import { updateAlwaysOnTop } from './window-actions';
import { windowHandler } from './window-handler';
import { windowExists } from './window-utils';

const readFile = util.promisify(fs.readFile);

class ScreenSnippet {
  private readonly tempDir: string;
  private readonly isOldWindows: boolean;
  private outputFilePath: string | undefined;
  private captureUtil: string;
  private captureUtilArgs: ReadonlyArray<string>;
  private child: ChildProcess | undefined;
  private focusedWindow: BrowserWindow | null = null;
  private shouldUpdateAlwaysOnTop: boolean = false;

  constructor() {
    if (isElectronQA) {
      this.tempDir = os.tmpdir();
    } else {
      this.tempDir = path.join(app.getPath('userData'), 'temp');
      if (!fs.existsSync(this.tempDir)) {
        fs.mkdirSync(this.tempDir);
      }
    }
    this.isOldWindows = isWindowsOS;
    // isWindowsOS &&
    // (parseInt(os.release().split('.')[0], 10) < 10 ||
    //   parseInt(os.release().split('.')[2], 10) < 15002);

    logger.info(
      `screen-snippet-handler: isOldWindows ${
        this.isOldWindows
      } os.release: ${os.release()}`,
    );

    this.captureUtil = '';
    this.captureUtilArgs = [];

    ipcMain.on(
      'snippet-analytics-data',
      async (
        _event,
        eventData: {
          element: AnalyticsElements;
          type: ScreenSnippetActionTypes;
        },
      ) => {
        analytics.track({
          element: eventData.element,
          action_type: eventData.type,
        });
      },
    );
  }

  /**
   * Captures a user selected portion of the monitor and returns jpeg image
   * encoded in base64 format.
   *
   * @param webContents {Electron.webContents}
   */
  public async capture(webContents: Electron.webContents) {
    const mainWindow = windowHandler.getMainWindow();
    if (mainWindow && windowExists(mainWindow) && isWindowsOS) {
      this.shouldUpdateAlwaysOnTop = mainWindow.isAlwaysOnTop();
      if (this.shouldUpdateAlwaysOnTop) {
        await updateAlwaysOnTop(false, false, false);
      }
    }
    logger.info(`screen-snippet-handler: Starting screen capture!`);
    this.outputFilePath = path.join(
      this.tempDir,
      'symphonyImage-' + Date.now() + '.png',
    );

    let usingClipboard = false;
    if (isMac) {
      this.captureUtil = '/usr/sbin/screencapture';
      this.captureUtilArgs = ['-i', '-s', '-t', 'png', this.outputFilePath];
    } else if (isWindowsOS) {
      if (windowHandler.isMana) {
        if (this.isOldWindows) {
          this.captureUtil = isDevEnv
            ? path.join(
                __dirname,
                '../../../node_modules/screen-snippet/ScreenSnippet.exe',
              )
            : path.join(path.dirname(app.getPath('exe')), 'ScreenSnippet.exe');
          this.captureUtilArgs = [
            '--no-annotate',
            this.outputFilePath,
            i18n.getLocale(),
          ];
        } else {
          this.captureUtil = 'SnippingTool';
          this.captureUtilArgs = ['/clip'];
          usingClipboard = true;
        }
      } else {
        this.captureUtil = isDevEnv
          ? path.join(
              __dirname,
              '../../../node_modules/screen-snippet/ScreenSnippet.exe',
            )
          : path.join(path.dirname(app.getPath('exe')), 'ScreenSnippet.exe');
        this.captureUtilArgs = [this.outputFilePath, i18n.getLocale()];
      }
    } else if (isLinux) {
      this.captureUtil = '/usr/bin/gnome-screenshot';
      this.captureUtilArgs = ['-a', '-f', this.outputFilePath];
    }

    this.focusedWindow = BrowserWindow.getFocusedWindow();

    logger.info(
      `screen-snippet-handler: Capturing snippet with file ${this.outputFilePath} and args ${this.captureUtilArgs}!`,
    );

    // only allow one screen capture at a time.
    if (this.child) {
      logger.info(
        `screen-snippet-handler: Child screen capture exists, killing it and keeping only 1 instance!`,
      );
      this.killChildProcess();
    }
    try {
      if (usingClipboard) {
        logger.info(
          `screen-snippet-handler: Using clipboard when capturing screen snippet`,
        );
        clipboard.clear();
        await this.execCmd(this.captureUtil, this.captureUtilArgs);
        fs.writeFileSync(this.outputFilePath, clipboard.readImage().toPNG());
        clipboard.clear();
      } else {
        await this.execCmd(this.captureUtil, this.captureUtilArgs);
      }
      if (windowHandler.isMana) {
        logger.info(
          'screen-snippet-handler: Attempting to extract image dimensions from: ' +
            this.outputFilePath,
        );
        const dimensions = this.getImageDimensions(this.outputFilePath);
        logger.info(
          'screen-snippet-handler: Extracted dimensions from image: ' +
            JSON.stringify(dimensions),
        );
        if (!dimensions) {
          logger.error('screen-snippet-handler: Could not get image size');
          return;
        }

        if (dimensions.width === 0 && dimensions.height === 0) {
          logger.info('screen-snippet-handler: no screen capture picture');
          return;
        }

        windowHandler.closeSnippingToolWindow();
        windowHandler.createSnippingToolWindow(this.outputFilePath, dimensions);
        this.uploadSnippet(webContents);
        return;
      }
      const {
        message,
        data,
        type,
      }: IScreenSnippet = await this.convertFileToData();
      logger.info(
        `screen-snippet-handler: Snippet captured! Sending data straight to SFE without opening annotate tool`,
      );
      webContents.send('screen-snippet-data', { message, data, type });
      await this.verifyAndUpdateAlwaysOnTop();
    } catch (error) {
      await this.verifyAndUpdateAlwaysOnTop();
      logger.error(
        `screen-snippet-handler: screen capture failed, user probably escaped the capture. Error: ${error}!`,
      );
    }
  }

  /**
   * Cancels a screen capture and closes the snippet window
   */
  public async cancelCapture() {
    if (!isWindowsOS || windowHandler.isMana || this.captureUtil === '') {
      return;
    }
    logger.info(`screen-snippet-handler: Cancel screen capture!`);
    this.focusedWindow = BrowserWindow.getFocusedWindow();

    try {
      await this.execCmd(this.captureUtil, []);
      await this.verifyAndUpdateAlwaysOnTop();
    } catch (error) {
      await this.verifyAndUpdateAlwaysOnTop();
      logger.error(
        `screen-snippet-handler: screen capture cancel failed with error: ${error}!`,
      );
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
   * @example execCmd('-i -s', '/user/desktop/symphonyImage-1544025391698.png')
   */
  private execCmd(
    captureUtil: string,
    captureUtilArgs: ReadonlyArray<string>,
  ): Promise<void> {
    logger.info(
      `screen-snippet-handlers: execCmd ${captureUtil} ${captureUtilArgs}`,
    );
    return new Promise<void>((resolve, reject) => {
      return (this.child = execFile(
        captureUtil,
        captureUtilArgs,
        (error: ExecException | null) => {
          if (error && error.killed) {
            // process was killed, just resolve with no data.
            return reject(error);
          }
          resolve();
        },
      ));
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
      if (!this.outputFilePath) {
        logger.info(
          `screen-snippet-handler: screen capture failed! output file doesn't exist!`,
        );
        return { message: 'output file name is required', type: 'ERROR' };
      }
      const data = await readFile(this.outputFilePath);
      if (!data) {
        logger.info(
          `screen-snippet-handler: screen capture failed! data doesn't exist!`,
        );
        return { message: `no file data provided`, type: 'ERROR' };
      }
      // convert binary data to base64 encoded string
      const output = Buffer.from(data).toString('base64');
      return { message: 'success', data: output, type: 'image/png;base64' };
    } catch (error) {
      // no such file exists or user likely aborted
      // creating snippet. also include any error when
      // creating child process.
      return error && error.code === 'ENOENT'
        ? { message: `file does not exist`, type: 'ERROR' }
        : { message: `${error}`, type: 'ERROR' };
    } finally {
      if (this.focusedWindow && windowExists(this.focusedWindow)) {
        this.focusedWindow.moveTop();
      }
    }
  }

  /**
   * Verify and updates always on top
   */
  private async verifyAndUpdateAlwaysOnTop(): Promise<void> {
    if (this.shouldUpdateAlwaysOnTop) {
      await updateAlwaysOnTop(true, false, false);
      this.shouldUpdateAlwaysOnTop = false;
    }
  }

  /**
   * Gets the dimensions of an image
   * @param filePath path to file to get image dimensions of
   */
  private getImageDimensions(
    filePath: string,
  ): {
    height: number;
    width: number;
  } {
    const img = nativeImage.createFromPath(filePath);
    const size = img.getSize();

    return size;
  }

  /**
   * Uploads a screen snippet
   * @param webContents A browser window's web contents object
   */
  private uploadSnippet(webContents: Electron.webContents) {
    ipcMain.once(
      'upload-snippet',
      async (
        _event,
        snippetData: { screenSnippetPath: string; mergedImageData: string },
      ) => {
        try {
          windowHandler.closeSnippingToolWindow();
          const [type, data] = snippetData.mergedImageData.split(',');
          const payload = {
            message: 'SUCCESS',
            data,
            type,
          };
          logger.info(
            'screen-snippet-handler: Snippet uploaded correctly, sending payload to SFE',
          );
          webContents.send('screen-snippet-data', payload);
          await this.verifyAndUpdateAlwaysOnTop();
        } catch (error) {
          await this.verifyAndUpdateAlwaysOnTop();
          logger.error(
            `screen-snippet-handler: upload of screen capture failed with error: ${error}!`,
          );
        }
      },
    );
  }
}

const screenSnippet = new ScreenSnippet();

export { screenSnippet };
