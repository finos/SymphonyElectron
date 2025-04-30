import { BrowserWindow, desktopCapturer, ipcMain, session } from 'electron';
import { NOTIFICATION_WINDOW_TITLE } from '../common/api-interface';
import { isDevEnv, isMac, isWindowsOS } from '../common/env';
import { logger } from '../common/logger';
import { windowHandler } from './window-handler';
import { createComponentWindow, windowExists } from './window-utils';

class DisplayMediaRequestHandler {
  private screenPickerWindow: BrowserWindow | null = null;
  private screenPickerPlaceholderWindow: BrowserWindow | null = null;

  /**
   * Display media request handler initialization
   */
  public init() {
    const { defaultSession } = session;
    /**
     * For MacOS 15+ the { useSystemPicker: true } overrides the code set in the handler,
     * and uses the native implementation.
     *
     * But for other versions and OSes, the code is executed.
     */
    defaultSession.setDisplayMediaRequestHandler(
      async (_request, callback) => {
        logger.info('display-media-request-handler: getting sources');
        const sources = await desktopCapturer.getSources({
          types: ['screen', 'window'],
          thumbnailSize: { height: 150, width: 150 },
        });

        const updatedSources = sources.filter(
          (source) => source.name !== NOTIFICATION_WINDOW_TITLE,
        );

        const browserWindowOptions = windowHandler.getWindowOpts(
          {
            alwaysOnTop: true,
            autoHideMenuBar: true,
            frame: false,
            modal: false,
            height: isMac ? 519 : 523,
            width: 580,
            show: false,
            fullscreenable: false,
          },
          { devTools: isDevEnv },
        );

        this.screenPickerWindow = createComponentWindow(
          'screen-picker',
          browserWindowOptions,
        );
        windowHandler.moveWindow(this.screenPickerWindow);

        this.screenPickerWindow.on('closed', () => {
          this.screenPickerWindow = null;
          ipcMain.removeAllListeners('screen-source-select');
          this.screenPickerWindow = null;
          if (isWindowsOS) {
            if (
              this.screenPickerPlaceholderWindow &&
              windowExists(this.screenPickerPlaceholderWindow)
            ) {
              this.screenPickerPlaceholderWindow.close();
              this.screenPickerPlaceholderWindow = null;
            }
          }
        });

        this.screenPickerWindow.webContents.once('did-finish-load', () => {
          if (!this.screenPickerWindow) {
            return;
          }
          this.screenPickerWindow.webContents.send('screen-picker-data', {
            sources: updatedSources,
          });
        });

        const mainWebContents = windowHandler.getMainWebContents();
        if (!mainWebContents) {
          return;
        }
        mainWebContents.send('screen-picker-data', updatedSources);

        ipcMain.on('screen-source-select', (_event, source) => {
          if (source != null) {
            windowHandler.closeScreenSharingIndicator();
            const timeoutValue = 300;
            setTimeout(() => {
              windowHandler.drawScreenShareIndicatorFrame(source);
            }, timeoutValue);
          }
          logger.info('display-media-request-handler: source selected', source);
        });

        ipcMain.once('screen-source-selected', (_event, source) => {
          this.screenPickerWindow?.close();
          logger.info(
            'display-media-request-handler: source to be shared',
            source,
          );
          if (!source) {
            windowHandler.closeScreenSharingIndicator();
            // @ts-ignore
            callback();
          } else {
            // SDA-3646 hack for macOS: whenever we try to close the penultimate window (here screensharing screen picker), Electron activates the last Electron window
            // This behaviour was observed while trying to upgrade from Electron 14 to Electron 17
            // Here the hack to solve that issue is to create a new invisible BrowserWindow.
            this.screenPickerPlaceholderWindow = new BrowserWindow({
              title: 'Screen sharing - Symphony',
              width: 0,
              height: 0,
              transparent: true,
              frame: false,
              x: 0,
              y: 0,
              resizable: false,
              movable: false,
              fullscreenable: false,
            });
            this.screenPickerPlaceholderWindow.show();
            callback({ video: source });
          }
        });
      },
      { useSystemPicker: true },
    );
  }

  /**
   * Closes screen picker if still open
   */
  public closeScreenPickerWindow() {
    logger.info(
      'display-media-request-handler: close screen picker if it exists',
    );
    this.screenPickerWindow?.close();
    this.screenPickerWindow = null;
  }
}

const displayMediaRequestHandler = new DisplayMediaRequestHandler();

export { displayMediaRequestHandler };
