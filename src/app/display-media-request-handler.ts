import { BrowserWindow, desktopCapturer, session } from 'electron';
import { NOTIFICATION_WINDOW_TITLE } from '../common/api-interface';
import { logger } from '../common/logger';

class DisplayMediaRequestHandler {
  private screenPickerWindow: BrowserWindow | null = null;

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

        callback({ video: updatedSources[0] });
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
