import { session, WebContents } from 'electron';
import { apiName } from '../common/api-interface';
import { isMac } from '../common/env';
import { logger } from '../common/logger';
import { getCommandLineArgs } from '../common/utils';
import { activate } from './window-actions';
import { windowHandler } from './window-handler';

enum protocol {
  SymphonyProtocol = 'symphony://',
}

class ProtocolHandler {
  private static isValidProtocolUri = (uri: string): boolean =>
    !!(uri && uri.startsWith(protocol.SymphonyProtocol));

  private preloadWebContents: WebContents | null = null;
  private protocolUri: string | null = null;

  constructor() {
    this.processArgv();
  }

  /**
   * Stores the web contents of the preload
   *
   * @param webContents {WeContents}
   */
  public setPreloadWebContents(webContents: WebContents): void {
    this.preloadWebContents = webContents;
    logger.info(
      `protocol handler: SFE is active and we have a valid protocol window with web contents!`,
    );
    if (this.protocolUri) {
      this.sendProtocol(this.protocolUri);
      logger.info(
        `protocol handler: we have a cached url ${this.protocolUri}, so, processed the request to SFE!`,
      );
      this.protocolUri = null;
    }
  }

  /**
   * Sends the protocol uri to the web app to further process
   *
   * @param url {String}
   * @param isAppRunning {Boolean} - whether the application is running
   */
  public sendProtocol(url: string, isAppRunning: boolean = true): void {
    if (url && url.length > 2083) {
      logger.info(
        `protocol-handler: protocol handler url length is greater than 2083, not performing any action!`,
      );
      return;
    }
    logger.info(
      `protocol handler: processing protocol request for the url ${url}!`,
    );
    // Handle protocol for Seamless login
    if (
      this.protocolUri?.includes('skey') &&
      this.protocolUri?.includes('anticsrf')
    ) {
      this.handleSeamlessLogin();
      return;
    }

    if (!this.preloadWebContents || !isAppRunning) {
      logger.info(
        `protocol handler: app was started from the protocol request. Caching the URL ${url}!`,
      );
      this.protocolUri = url;
      return;
    }

    // This is needed for mac OS as it brings pop-outs to foreground
    // (if it has been previously focused) instead of main window
    if (isMac) {
      activate(apiName.mainWindowName);
    }

    if (ProtocolHandler.isValidProtocolUri(url)) {
      logger.info(
        `protocol handler: our protocol request is a valid url ${url}! sending request to SFE for further action!`,
      );
      this.preloadWebContents.send('protocol-action', url);
    }
  }

  /**
   * Handles protocol uri from process.argv
   *
   * @param argv {String[]} - data received from process.argv
   */
  public processArgv(argv?: string[], isAppAlreadyOpen: boolean = false): void {
    logger.info(`protocol handler: processing protocol args!`);
    const protocolUriFromArgv = getCommandLineArgs(
      argv || process.argv,
      protocol.SymphonyProtocol,
      false,
    );
    if (protocolUriFromArgv) {
      logger.info(
        `protocol handler: we have a protocol request for the url ${protocolUriFromArgv}!`,
      );
      this.sendProtocol(protocolUriFromArgv, isAppAlreadyOpen);
    }
  }

  /**
   * Sets session cookies and navigates to the pod url
   */
  public handleSeamlessLogin(): void {
    if (this.protocolUri) {
      const urlParams = new URLSearchParams(new URL(this.protocolUri).search);
      const url = windowHandler.url || '';
      const cookie = {
        url,
        skey: urlParams.get('skey'),
        'anti-csrf-cookie': urlParams.get('anticsrf'),
      };
      session.defaultSession.cookies.set(cookie).then(
        () => {
          const mainWebContents = windowHandler.getMainWebContents();
          if (!mainWebContents?.isDestroyed() && windowHandler.url) {
            logger.info(
              'protocol-handler: redirecting main webContents',
              windowHandler.url,
            );
            mainWebContents?.loadURL(windowHandler.url);
          }
        },
        (error) => {
          logger.error('protocol-handler: unable to set cookies', error);
        },
      );
    }
  }
}

const protocolHandler = new ProtocolHandler();

export { protocolHandler };
