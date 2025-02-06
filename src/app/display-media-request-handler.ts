import { desktopCapturer, ipcMain, session } from 'electron';
import { NOTIFICATION_WINDOW_TITLE } from '../common/api-interface';
import { isDevEnv, isMac } from '../common/env';
import { logger } from '../common/logger';
import {
  ICustomBrowserWindowConstructorOpts,
  windowHandler,
} from './window-handler';
import { createComponentWindow, windowExists } from './window-utils';

/**
 * For MacOS 15+ the { useSystemPicker: true } overrides the code set in the handler,
 * and uses the native implementation.
 *
 * But for other versions and OSes, the code is executed.
 */
export const setDisplayMediaRequestHandler = () => {
  const { defaultSession } = session;
  defaultSession.setDisplayMediaRequestHandler(
    async (_request, callback) => {
      logger.info('display-media-request-handler: getting sources');
      const sources = await desktopCapturer.getSources({
        types: ['screen', 'window'],
        thumbnailSize: {
          height: 150,
          width: 150,
        },
      });

      const updatedSources = sources.filter(
        (source) => source.name !== NOTIFICATION_WINDOW_TITLE,
      );

      const browserWindowOptions: ICustomBrowserWindowConstructorOpts =
        windowHandler.getWindowOpts(
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
          {
            devTools: isDevEnv,
          },
        );
      const screenPickerWindow = createComponentWindow(
        'screen-picker',
        browserWindowOptions,
      );

      screenPickerWindow.webContents.once('did-finish-load', () => {
        if (!screenPickerWindow || !windowExists(screenPickerWindow)) {
          return;
        }
        screenPickerWindow.webContents.send('screen-picker-data', {
          sources: updatedSources,
        });
      });

      const mainWebContents = windowHandler.getMainWebContents();
      if (!mainWebContents) {
        return;
      }
      mainWebContents.send('screen-picker-data', updatedSources);

      ipcMain.on(
        'screen-source-select',
        (_event, source: Electron.DesktopCapturerSource) => {
          if (source) {
            windowHandler.drawScreenShareIndicatorFrame(source);
          }
          logger.info('display-media-request-handler: source selected', source);
        },
      );

      ipcMain.once(
        'screen-source-selected',
        (_event, source: Electron.DesktopCapturerSource) => {
          screenPickerWindow.close();
          logger.info(
            'display-media-request-handler: source to be shared',
            source,
          );
          if (!source) {
            windowHandler.closeScreenSharingIndicator();
            /**
             * Passing the empty stream crashes the main process,
             * but passing an empty callback throws an AbortError.
             */
            // @ts-ignore
            callback();
          } else {
            callback({ video: source });
          }
        },
      );
    },
    { useSystemPicker: true },
  );
};
