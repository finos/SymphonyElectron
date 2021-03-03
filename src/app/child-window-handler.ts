import { BrowserWindow, crashReporter, WebContents } from 'electron';

import { parse as parseQuerystring } from 'querystring';
import { format, parse, Url } from 'url';
import { isWindowsOS } from '../common/env';
import { i18n } from '../common/i18n';
import { logger } from '../common/logger';
import { getGuid } from '../common/utils';
import { whitelistHandler } from '../common/whitelist-handler';
import { config } from './config-handler';
import crashHandler from './crash-handler';
import {
  handlePermissionRequests,
  monitorWindowActions,
  onConsoleMessages,
  removeWindowEventListener,
  sendInitialBoundChanges,
} from './window-actions';
import { ICustomBrowserWindow, windowHandler } from './window-handler';
import {
  getBounds,
  // handleCertificateProxyVerification,
  injectStyles,
  preventWindowNavigation,
} from './window-utils';

const DEFAULT_POP_OUT_WIDTH = 300;
const DEFAULT_POP_OUT_HEIGHT = 600;

const MIN_WIDTH = 300;
const MIN_HEIGHT = 300;

/**
 * Verifies protocol for a new url to check if it is http or https
 * @param url URL to be verified
 */
const verifyProtocolForNewUrl = (url: string): boolean => {
  const parsedUrl = parse(url);
  if (!parsedUrl || !parsedUrl.protocol) {
    logger.info(
      `child-window-handler: The url ${url} doesn't have a protocol. Returning false for verification!`,
    );
    return false;
  }

  const allowedProtocols = ['http:', 'https:', 'mailto:'];
  // url parse returns protocol with :
  if (allowedProtocols.includes(parsedUrl.protocol)) {
    logger.info(
      `child-window-handler: Protocol of the url ${url} is whitelisted! Returning true for verification!`,
    );
    return true;
  }

  return false;
};

/**
 * Verifies if the url is valid and forcefully appends https if not present
 * This happens mainly for urls from the same domain
 *
 * @param url {string}
 */
const getParsedUrl = (url: string): Url => {
  const parsedUrl = parse(url);

  if (!parsedUrl.protocol || parsedUrl.protocol !== 'https') {
    logger.info(
      `child-window-handler: The url ${url} doesn't have a valid protocol. Adding https as protocol.`,
    );
    parsedUrl.protocol = 'https:';
    parsedUrl.slashes = true;
  }
  const finalParsedUrl = parse(format(parsedUrl));
  logger.info(
    `child-window-handler: The original url ${url} is finally parsed as ${JSON.stringify(
      finalParsedUrl,
    )}`,
  );
  return finalParsedUrl;
};

export const handleChildWindow = (webContents: WebContents): void => {
  const childWindow = (
    event,
    newWinUrl,
    frameName,
    disposition,
    newWinOptions,
  ): void => {
    logger.info(`child-window-handler: trying to create new child window for url: ${newWinUrl},
         frame name: ${frameName || undefined}, disposition: ${disposition}`);
    const mainWindow = windowHandler.getMainWindow();
    if (!mainWindow || mainWindow.isDestroyed()) {
      logger.info(
        `child-window-handler: main window is not available / destroyed, not creating child window!`,
      );
      return;
    }
    if (!windowHandler.url) {
      logger.info(
        `child-window-handler: we don't have a valid url, not creating child window!`,
      );
      return;
    }

    if (!newWinOptions.webPreferences) {
      newWinOptions.webPreferences = {};
    }

    Object.assign(newWinOptions.webPreferences, webContents);

    // need this to extract other parameters
    const newWinParsedUrl = getParsedUrl(newWinUrl);

    const newWinUrlData = whitelistHandler.parseDomain(newWinUrl);
    const mainWinUrlData = whitelistHandler.parseDomain(windowHandler.url);

    const newWinDomainName = `${newWinUrlData.domain}${newWinUrlData.tld}`;
    const mainWinDomainName = `${mainWinUrlData.domain}${mainWinUrlData.tld}`;

    logger.info(
      `child-window-handler: main window url: ${mainWinUrlData.subdomain}.${mainWinUrlData.domain}.${mainWinUrlData.tld}`,
    );

    const emptyUrlString = ['about:blank', 'about:blank#blocked'];
    const dispositionWhitelist = ['new-window', 'foreground-tab'];

    // only allow window.open to succeed is if coming from same host,
    // otherwise open in default browser.
    if (
      (newWinDomainName === mainWinDomainName ||
        emptyUrlString.includes(newWinUrl)) &&
      frameName !== '' &&
      dispositionWhitelist.includes(disposition)
    ) {
      logger.info(
        `child-window-handler: opening pop-out window for ${newWinUrl}`,
      );

      const newWinKey = getGuid();
      if (!frameName) {
        logger.info(
          `child-window-handler: frame name missing! not opening the url ${newWinUrl}`,
        );
        return;
      }

      const width = newWinOptions.width || DEFAULT_POP_OUT_WIDTH;
      const height = newWinOptions.height || DEFAULT_POP_OUT_HEIGHT;

      // try getting x and y position from query parameters
      const query =
        newWinParsedUrl && parseQuerystring(newWinParsedUrl.query as string);
      if (query && query.x && query.y) {
        const newX = Number.parseInt(query.x as string, 10);
        const newY = Number.parseInt(query.y as string, 10);
        // only accept if both are successfully parsed.
        if (Number.isInteger(newX) && Number.isInteger(newY)) {
          const newWinRect = { x: newX, y: newY, width, height };
          const { x, y } = getBounds(
            newWinRect,
            DEFAULT_POP_OUT_WIDTH,
            DEFAULT_POP_OUT_HEIGHT,
          );
          newWinOptions.x = x;
          newWinOptions.y = y;
        } else {
          newWinOptions.x = 0;
          newWinOptions.y = 0;
        }
      } else {
        // create new window at slight offset from main window.
        const { x, y } = mainWindow.getBounds();
        newWinOptions.x = x + 50;
        newWinOptions.y = y + 50;
      }

      newWinOptions.width = Math.max(width, DEFAULT_POP_OUT_WIDTH);
      newWinOptions.height = Math.max(height, DEFAULT_POP_OUT_HEIGHT);
      newWinOptions.minWidth = MIN_WIDTH;
      newWinOptions.minHeight = MIN_HEIGHT;
      newWinOptions.alwaysOnTop = mainWindow.isAlwaysOnTop();
      newWinOptions.frame = true;
      newWinOptions.winKey = newWinKey;
      newWinOptions.fullscreen = false;

      const childWebContents: WebContents = newWinOptions.webContents;
      // Event needed to hide native menu bar
      childWebContents.once('did-start-loading', () => {
        const browserWin = BrowserWindow.fromWebContents(
          childWebContents,
        ) as ICustomBrowserWindow;
        const { contextOriginUrl } = config.getGlobalConfigFields([
          'contextOriginUrl',
        ]);
        browserWin.setFullScreenable(true);
        browserWin.origin = contextOriginUrl || windowHandler.url;
        if (isWindowsOS && browserWin && !browserWin.isDestroyed()) {
          browserWin.setMenuBarVisibility(false);
        }
      });

      childWebContents.once('did-finish-load', async () => {
        logger.info(
          `child-window-handler: child window content loaded for url ${newWinUrl}!`,
        );
        const browserWin: ICustomBrowserWindow = BrowserWindow.fromWebContents(
          childWebContents,
        ) as ICustomBrowserWindow;
        if (!browserWin) {
          return;
        }
        windowHandler.addWindow(newWinKey, browserWin);
        const { url } = config.getGlobalConfigFields(['url']);
        const { enableRendererLogs } = config.getConfigFields([
          'enableRendererLogs',
        ]);
        browserWin.webContents.send('page-load', {
          isWindowsOS,
          locale: i18n.getLocale(),
          resources: i18n.loadedResources,
          origin: url,
          enableCustomTitleBar: false,
          isMainWindow: false,
        });
        // Inserts css on to the window
        await injectStyles(browserWin, false);
        browserWin.winName = frameName;
        browserWin.setAlwaysOnTop(mainWindow.isAlwaysOnTop());
        logger.info(
          `child-window-handler: setting always on top for child window? ${mainWindow.isAlwaysOnTop()}!`,
        );

        // prevents window from navigating
        preventWindowNavigation(browserWin, true);

        // Handle media/other permissions
        handlePermissionRequests(browserWin.webContents);

        // Monitor window actions
        monitorWindowActions(browserWin);

        // Update initial bound changes
        sendInitialBoundChanges(browserWin);

        if (enableRendererLogs) {
          browserWin.webContents.on('console-message', onConsoleMessages);
        }

        // Remove all attached event listeners
        browserWin.on('close', () => {
          logger.info(
            `child-window-handler: close event occurred for window with url ${newWinUrl}!`,
          );
          removeWindowEventListener(browserWin);
        });

        crashReporter.start({
          submitURL: '',
          uploadToServer: false,
          ignoreSystemCrashHandler: false,
        });

        crashHandler.handleRendererCrash(browserWin);

        if (browserWin.webContents) {
          // validate link and create a child window or open in browser
          handleChildWindow(browserWin.webContents);

          // Certificate verification proxy
          // if (!isDevEnv) {
          //    browserWin.webContents.session.setCertificateVerifyProc(handleCertificateProxyVerification);
          // }

          // Updates media permissions for preload context
          const { permissions } = config.getConfigFields(['permissions']);
          browserWin.webContents.send(
            'is-screen-share-enabled',
            permissions.media,
          );
        }
      });
    } else {
      event.preventDefault();
      if (newWinUrl && newWinUrl.length > 2083) {
        logger.info(
          `child-window-handler: new window url length is greater than 2083, not performing any action!`,
        );
        return;
      }
      if (!verifyProtocolForNewUrl(newWinUrl)) {
        logger.info(
          `child-window-handler: new window url protocol is not http or https, not performing any action!`,
        );
        return;
      }
      logger.info(`child-window-handler: new window url is ${newWinUrl} which is not of the same host,
            so opening it in the default app!`);
      windowHandler.openUrlInDefaultBrowser(newWinUrl);
    }
  };
  webContents.on('new-window', childWindow);
};
