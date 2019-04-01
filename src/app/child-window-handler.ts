import { BrowserWindow, WebContents } from 'electron';

import { parse as parseQuerystring } from 'querystring';
import { format, parse, Url } from 'url';
import { isDevEnv, isWindowsOS } from '../common/env';
import { getGuid } from '../common/utils';
import { monitorWindowActions, removeWindowEventListener } from './window-actions';
import { ICustomBrowserWindow, windowHandler } from './window-handler';
import {
    getBounds,
    handleCertificateProxyVerification,
    injectStyles,
    preventWindowNavigation,
} from './window-utils';

const DEFAULT_POP_OUT_WIDTH = 300;
const DEFAULT_POP_OUT_HEIGHT = 600;

const MIN_WIDTH = 300;
const MIN_HEIGHT = 300;

/**
 * Verifies if the url is valid and
 * forcefully appends https if not present
 *
 * @param configURL {string}
 */
const getParsedUrl = (configURL: string): Url => {
    const parsedUrl = parse(configURL);

    if (!parsedUrl.protocol || parsedUrl.protocol !== 'https') {
        parsedUrl.protocol = 'https:';
        parsedUrl.slashes = true;
    }
    return parse(format(parsedUrl));
};

export const handleChildWindow = (webContents: WebContents): void => {
    const childWindow = (event, newWinUrl, frameName, disposition, newWinOptions): void => {
        const mainWindow = windowHandler.getMainWindow();
        if (!mainWindow || mainWindow.isDestroyed()) {
            return;
        }
        if (!windowHandler.url) {
            return;
        }

        if (!newWinOptions.webPreferences) {
            newWinOptions.webPreferences = {};
        }
        Object.assign(newWinOptions.webPreferences, webContents);
        const newWinParsedUrl = getParsedUrl(newWinUrl);
        const mainWinParsedUrl = getParsedUrl(windowHandler.url);

        const newWinHost = newWinParsedUrl && newWinParsedUrl.host;
        const mainWinHost = mainWinParsedUrl && mainWinParsedUrl.host;

        const emptyUrlString = 'about:blank';
        const dispositionWhitelist = ['new-window', 'foreground-tab'];

        // only allow window.open to succeed is if coming from same hsot,
        // otherwise open in default browser.
        if ((newWinHost === mainWinHost || newWinUrl === emptyUrlString) && dispositionWhitelist.includes(disposition)) {

            const newWinKey = getGuid();
            if (!frameName) {
                // abort - no frame name provided.
                return;
            }

            const width = newWinOptions.width || DEFAULT_POP_OUT_WIDTH;
            const height = newWinOptions.height || DEFAULT_POP_OUT_HEIGHT;

            // try getting x and y position from query parameters
            const query = newWinParsedUrl && parseQuerystring(newWinParsedUrl.query as string);
            if (query && query.x && query.y) {
                const newX = Number.parseInt(query.x as string, 10);
                const newY = Number.parseInt(query.y as string, 10);
                // only accept if both are successfully parsed.
                if (Number.isInteger(newX) && Number.isInteger(newY)) {
                    const newWinRect = { x: newX, y: newY, width, height };
                    const { x, y } = getBounds(newWinRect, DEFAULT_POP_OUT_WIDTH, DEFAULT_POP_OUT_HEIGHT);

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

            const childWebContents: WebContents = newWinOptions.webContents;
            // Event needed to hide native menu bar
            childWebContents.once('did-start-loading', () => {
                const browserWin = BrowserWindow.fromWebContents(childWebContents);
                if (isWindowsOS && browserWin && !browserWin.isDestroyed()) {
                    browserWin.setMenuBarVisibility(false);
                }
            });

            childWebContents.once('did-finish-load', async () => {
                const browserWin: ICustomBrowserWindow = BrowserWindow.fromWebContents(childWebContents) as ICustomBrowserWindow;
                if (!browserWin) {
                    return;
                }
                windowHandler.addWindow(newWinKey, browserWin);
                browserWin.webContents.send('page-load', { isWindowsOS });
                // Inserts css on to the window
                await injectStyles(browserWin, false);
                browserWin.winName = frameName;
                browserWin.setAlwaysOnTop(mainWindow.isAlwaysOnTop());

                // prevents window from navigating
                preventWindowNavigation(browserWin, true);

                // Monitor window actions
                monitorWindowActions(browserWin);
                // Remove all attached event listeners
                browserWin.on('close', () => {
                    removeWindowEventListener(browserWin);
                });

                // Certificate verification proxy
                if (!isDevEnv) {
                    browserWin.webContents.session.setCertificateVerifyProc(handleCertificateProxyVerification);
                }
                // TODO: handle Permission Requests
            });
        } else {
            event.preventDefault();
            windowHandler.openUrlInDefaultBrowser(newWinUrl);
        }
    };
    webContents.on('new-window', childWindow);
};
