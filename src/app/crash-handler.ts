import {
  app,
  crashReporter,
  Details,
  dialog,
  Event,
  RenderProcessGoneDetails,
} from 'electron';
import { i18n } from '../common/i18n';
import { logger } from '../common/logger';
import {
  analytics,
  AnalyticsElements,
  ICrashData,
  SDACrashProcess,
} from './analytics-handler';
import { ICustomBrowserWindow } from './window-handler';
import { windowExists } from './window-utils';

class CrashHandler {
  /**
   * Shows a message to the user to take further action
   * @param browserWindow Browser Window to show the dialog on
   * @private
   */
  private static async showMessageToUser(browserWindow: ICustomBrowserWindow) {
    if (!browserWindow || !windowExists(browserWindow)) {
      return;
    }
    const { response } = await dialog.showMessageBox({
      type: 'error',
      title: i18n.t('Renderer Process Crashed')(),
      message: i18n.t(
        'Oops! Looks like we have had a crash. Please reload or close this window.',
      )(),
      buttons: ['Reload', 'Close'],
    });
    response === 0 ? browserWindow.reload() : browserWindow.close();
  }

  /**
   * Handles a GPU crash event
   * @private
   */
  private static handleGpuCrash() {
    app.on('child-process-gone', (_event: Event, details: Details) => {
      logger.error(
        `crash-handler: ${details.exitCode} - ${details.serviceName} - ${details.name} - ${details.type}} process gone. Reason: ${details.reason}`,
      );
      const eventData: ICrashData = {
        element: AnalyticsElements.SDA_CRASH,
        process: SDACrashProcess.GPU,
        windowName: 'main',
        crashCause: details.reason,
      };
      analytics.track(eventData);
      logger.error(
        `crash-handler: GPU process crash event processed with data ${JSON.stringify(
          eventData,
        )}`,
      );
    });
  }

  /**
   * Handles a main process crash event
   * @private
   */
  private static handleMainProcessCrash() {
    const lastCrash = crashReporter.getLastCrashReport();
    if (!lastCrash) {
      logger.info(`crash-handler: No crashes found for main process`);
      return;
    }
    logger.info('crash-handler: Main process crashes found');
  }

  constructor() {
    CrashHandler.handleMainProcessCrash();
    CrashHandler.handleGpuCrash();
  }

  /**
   * Handles a crash event for a browser window
   * @param browserWindow Browser Window on which the crash should be handled
   */
  public handleRendererCrash(browserWindow: ICustomBrowserWindow) {
    browserWindow.webContents.on(
      'render-process-gone',
      async (_event: Event, details: RenderProcessGoneDetails) => {
        logger.info(`crash-handler: Renderer process for ${browserWindow.winName} crashed.
            Reason is ${details.reason}`);
        const eventData: ICrashData = {
          element: AnalyticsElements.SDA_CRASH,
          process: SDACrashProcess.RENDERER,
          windowName: browserWindow.winName,
          crashCause: details.reason,
        };
        switch (details.reason) {
          case 'abnormal-exit':
          case 'crashed':
          case 'integrity-failure':
          case 'launch-failed':
          case 'oom':
            await CrashHandler.showMessageToUser(browserWindow);
            analytics.track(eventData);
            logger.info(
              `crash-handler: Renderer process crash event processed with data ${JSON.stringify(
                eventData,
              )}`,
              details,
            );
            break;
          default:
            break;
        }
      },
    );
  }
}

const crashHandler = new CrashHandler();

export default crashHandler;
