import {
  app,
  BrowserWindow,
  clipboard,
  dialog,
  ipcMain,
  NativeImage,
  nativeImage,
  WebContents,
} from 'electron';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { ChildProcess, execFile, ExecFileException } from 'child_process';
import * as util from 'util';
import { apiName, IScreenSnippet } from '../common/api-interface';
import {
  isDevEnv,
  isElectronQA,
  isLinux,
  isMac,
  isWindowsOS,
} from '../common/env';
import { i18n } from '../common/i18n';
import { ScreenShotAnnotation } from '../common/ipcEvent';
import { logger } from '../common/logger';
import {
  analytics,
  AnalyticsElements,
  ScreenSnippetActionTypes,
} from './analytics-handler';
import { winStore } from './stores';
import { IWindowState } from './stores/window-store';
import { updateAlwaysOnTop } from './window-actions';
import { ICustomBrowserWindow, windowHandler } from './window-handler';
import { windowExists } from './window-utils';

const readFile = util.promisify(fs.readFile);

export interface IListItem {
  name: string;
  event: string;
  dataTestId: string;
  onClick: (eventName: string) => Promise<void>;
}

class ScreenSnippet {
  private readonly tempDir: string;
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
   * @param webContents {WeContents}
   */
  public async capture(webContents: WebContents, hideOnCapture?: boolean) {
    const currentWindowObj = BrowserWindow.getFocusedWindow();
    const currentWindowName = (currentWindowObj as ICustomBrowserWindow)
      ?.winName;
    const mainWindow = windowHandler.getMainWindow();
    windowHandler.closeSnippingToolWindow();
    if (hideOnCapture) {
      this.storeWindowsState(mainWindow, currentWindowObj);
      winStore.hideWindowsOnCapturing(hideOnCapture);
    }
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

    if (isMac) {
      logger.info('screen-snippet-handler: Mac');
      this.captureUtil = '/usr/sbin/screencapture';
      this.captureUtilArgs = ['-i', '-s', '-t', 'png', this.outputFilePath];
    } else if (isWindowsOS) {
      logger.info('screen-snippet-handler: Windows');
      if (windowHandler.isMana) {
        logger.info('screen-snippet-handler: Mana, no native annotate');
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
      await this.execCmd(this.captureUtil, this.captureUtilArgs);

      if (windowHandler.isMana) {
        winStore.restoreWindows(hideOnCapture);
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
        windowHandler.createSnippingToolWindow(
          this.outputFilePath,
          dimensions,
          currentWindowName,
          hideOnCapture,
        );
        this.uploadSnippet(webContents, hideOnCapture);
        this.closeSnippet();
        this.copyToClipboard();
        this.saveAs();
        return;
      }
      const { message, data, type }: IScreenSnippet =
        await this.convertFileToData();
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
        (error: ExecFileException | null) => {
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
    } catch (error: any) {
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
  private getImageDimensions(filePath: string): {
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
  private uploadSnippet(webContents: WebContents, hideOnCapture?: boolean) {
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
          winStore.restoreWindows(hideOnCapture);
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

  /**
   * Close the current snippet
   */
  private closeSnippet() {
    ipcMain.once(ScreenShotAnnotation.CLOSE, async (_event) => {
      try {
        windowHandler.closeSnippingToolWindow();
        await this.verifyAndUpdateAlwaysOnTop();
      } catch (error) {
        await this.verifyAndUpdateAlwaysOnTop();
        logger.error(
          `screen-snippet-handler: close window failed with error: ${error}!`,
        );
      }
    });
  }

  /**
   * Cancels a screen capture and closes the snippet window
   */
  private copyToClipboard() {
    ipcMain.on(
      ScreenShotAnnotation.COPY_TO_CLIPBOARD,
      async (
        _event,
        copyToClipboardData: {
          action: string;
          clipboard: string;
        },
      ) => {
        logger.info(`screen-snippet-handler: Copied!`);
        this.focusedWindow = BrowserWindow.getFocusedWindow();

        try {
          const [, data] = copyToClipboardData.clipboard.split(',');

          const buffer = Buffer.from(data, 'base64');
          const img = nativeImage.createFromBuffer(buffer);

          clipboard.writeImage(img);

          await this.verifyAndUpdateAlwaysOnTop();
        } catch (error) {
          await this.verifyAndUpdateAlwaysOnTop();
          logger.error(
            `screen-snippet-handler: cannot copy, failed with error: ${error}!`,
          );
        }
      },
    );
  }

  /**
   * Trigger save modal to save the snippet
   */
  private saveAs() {
    ipcMain.on(
      ScreenShotAnnotation.SAVE_AS,
      async (
        _event,
        saveAsData: {
          clipboard: string;
        },
      ) => {
        if (isMac) {
          windowHandler.closeSnippingToolWindow();
        }
        const filePath = path.join(
          app.getPath('downloads'),
          'symphonyImage-' + Date.now() + '.png',
        );
        const [, data] = saveAsData.clipboard.split(',');
        const buffer = Buffer.from(data, 'base64');
        const img = nativeImage.createFromBuffer(buffer);
        const dialogResult = await this.saveFile(
          filePath,
          img,
          BrowserWindow.getFocusedWindow(),
        );
        if (dialogResult?.filePath) {
          windowHandler.closeSnippingToolWindow();
        }
      },
    );
  }

  /**
   * Store current windows state before hiding it
   */
  private storeWindowsState = (
    mainWindow: ICustomBrowserWindow | null,
    currentWindowObj: BrowserWindow | null,
  ) => {
    const windowObj = winStore.getWindowStore();
    const currentWindowName = (currentWindowObj as ICustomBrowserWindow)
      ?.winName;
    if (windowObj.windows.length > 0) {
      winStore.destroyWindowStore();
    }
    const allWindows = BrowserWindow.getAllWindows();
    let windowsArr: IWindowState[] = [];
    const mainArr: IWindowState[] = [
      {
        id: 'main',
        focused: mainWindow?.isFocused(),
        minimized: mainWindow?.isMinimized(),
        isFullScreen: mainWindow?.isFullScreen(),
        isVisible: mainWindow?.isVisible(),
      },
    ];

    allWindows.forEach((window) => {
      if (
        (window as ICustomBrowserWindow).winName &&
        (window as ICustomBrowserWindow).winName !== currentWindowName &&
        (window as ICustomBrowserWindow).winName !== 'main' &&
        (window as ICustomBrowserWindow).winName !==
          apiName.notificationWindowName
      ) {
        windowsArr.push({
          id: (window as ICustomBrowserWindow).winName,
          focused: window.isFocused(),
          minimized: window?.isMinimized(),
          isFullScreen: window?.isFullScreen(),
          isVisible: window?.isVisible(),
        });
      }
    });

    if (currentWindowName !== 'main') {
      windowsArr.push({
        id: currentWindowName,
        focused: currentWindowObj?.isFocused(),
        minimized: currentWindowObj?.isMinimized(),
        isFullScreen: currentWindowObj?.isFullScreen(),
        isVisible: currentWindowObj?.isVisible(),
      });
      windowsArr = mainArr.concat(windowsArr);
    } else {
      windowsArr = windowsArr.concat(mainArr);
    }
    winStore.setWindowStore({
      windows: windowsArr,
    });
  };

  /**
   * Save image in a given location
   * @param filePath where the image should be stored
   * @param img the image
   * @param parent parent window to attach save dialog
   */
  private saveFile = (
    filePath: string,
    img: NativeImage,
    parentWindow: BrowserWindow | null,
  ) => {
    const saveOptions = {
      title: 'Select place to store your file',
      defaultPath: filePath,
      // defaultPath: path.join(__dirname, '../assets/'),
      buttonLabel: 'Save',
      // Restricting the user to only Text Files.
      filters: [
        {
          name: 'Image file',
          extensions: ['png'],
        },
      ],
      properties: [],
    };
    const saveDialog =
      !isMac && parentWindow
        ? dialog.showSaveDialog(parentWindow, saveOptions)
        : dialog.showSaveDialog(saveOptions);
    return saveDialog
      .then((file) => {
        // Stating whether dialog operation was cancelled or not.
        if (!file.canceled && file.filePath) {
          // Creating and Writing to the sample.txt file
          fs.writeFile(file.filePath.toString(), img.toPNG(), (err) => {
            if (err) {
              throw logger.error(
                `screen-snippet-handler: cannot save file, failed with error: ${err}!`,
              );
            }

            logger.info(`screen-snippet-handler: modal save opened!`);
          });
        }

        return file;
      })
      .catch((err) => {
        logger.error(
          `screen-snippet-handler: cannot save file, failed with error: ${err}!`,
        );

        return undefined;
      });
  };
}

const screenSnippet = new ScreenSnippet();

export { screenSnippet };
