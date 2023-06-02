import { app, BrowserWindow, dialog, MessageBoxOptions } from 'electron';

import { i18n } from '../common/i18n';
import { logger } from '../common/logger';
import { whitelistHandler } from '../common/whitelist-handler';
import { CloudConfigDataTypes, config } from './config-handler';
import { ICustomBrowserWindow, windowHandler } from './window-handler';
import { windowExists } from './window-utils';

let currentAuthURL: string;
let tries = 0;

app.on('login', (event, webContents, request, authInfo, callback) => {
  event.preventDefault();

  // This check is to determine whether the request is for the same
  // host if so then increase the login tries from which we can
  // display invalid credentials
  if (currentAuthURL !== request.url) {
    currentAuthURL = request.url;
    tries = 0;
  } else {
    tries++;
  }

  // name of the host to display
  const hostname = authInfo.host || authInfo.realm;
  const browserWin: ICustomBrowserWindow = BrowserWindow.fromWebContents(
    webContents,
  ) as ICustomBrowserWindow;

  /**
   * Method that resets currentAuthURL and tries
   * if user closes the auth window
   */
  const clearSettings = () => {
    currentAuthURL = '';
    tries = 0;
  };

  /**
   * Opens an electron modal window in which
   * user can enter credentials fot the host
   */
  windowHandler.createBasicAuthWindow(
    browserWin,
    hostname,
    tries === 0,
    clearSettings,
    callback,
  );
});

/**
 * If certificate error occurs allow user to deny or allow particular certificate
 * error.
 *
 * Note: the dialog is synchronous so further processing is blocked until
 * user provides a response.
 */
const siteNameAcceptedStatus = new Map<string, boolean>();
app.on(
  'certificate-error',
  async (event, webContents, url, error, _certificate, callback) => {
    // TODO: Add logic verify custom certificate
    event.preventDefault();
    const { tld, domain, subdomain } = whitelistHandler.parseDomain(url);
    let siteName = `${domain}${tld}`;
    if (subdomain.length) {
      siteName = `${subdomain}.${siteName}`;
    }
    logger.warn(`Certificate error: ${error} for url: ${siteName}`);

    const isSiteNameAccepted = siteNameAcceptedStatus.get(siteName);
    if (isSiteNameAccepted !== undefined) {
      callback(isSiteNameAccepted);
      return;
    }

    const browserWin = BrowserWindow.fromWebContents(webContents);
    if (browserWin && windowExists(browserWin)) {
      const { response } = await dialog.showMessageBox(browserWin, {
        type: 'warning',
        buttons: [i18n.t('Allow once (risky)')(), i18n.t('Deny')()],
        defaultId: 1,
        cancelId: 1,
        noLink: true,
        title: i18n.t('Certificate Error')(),
        message: `${siteName} ${i18n.t(
          'Invalid security certificate',
        )()}\n ${error}`,
      });
      siteNameAcceptedStatus.set(siteName, !response);
      callback(!response);
    }
  },
);

/**
 * Show dialog pinned to given window when loading error occurs
 *
 * @param  browserWindow        {BrowserWindow} Window to host dialog
 * @param  url                  {String} Url that failed
 * @param  errorDesc            {String} Description of error
 * @param  errorCode            {Number} Error code
 * @param  retryCallback        {function} Callback when user clicks reload
 * @param  showDialog           {Boolean} Indicates if a dialog need to be show to a user
 */
export const showLoadFailure = async (
  browserWindow: Electron.BrowserWindow,
  url: string,
  errorDesc: string,
  errorCode: number,
  retryCallback: () => void,
  showDialog: boolean,
): Promise<void> => {
  let message = url
    ? `${i18n.t('Error loading URL')()}:\n${url}`
    : i18n.t('Error loading window')();
  if (errorDesc) {
    message += `\n\n${errorDesc}`;
  }
  if (errorCode) {
    message += `\n\nError Code: ${errorCode}`;
  }

  if (showDialog) {
    const { response } = await dialog.showMessageBox(browserWindow, {
      type: 'error',
      buttons: [i18n.t('Reload')(), i18n.t('Ignore')()],
      defaultId: 0,
      cancelId: 1,
      noLink: true,
      title: i18n.t('Loading Error')(),
      message,
    });

    // async handle of user input
    // retry if hitting button index 0 (i.e., reload)
    if (response === 0 && typeof retryCallback === 'function') {
      retryCallback();
    }
  }

  logger.warn(
    `Load failure msg: ${errorDesc} errorCode: ${errorCode} for url: ${url}`,
  );
};

/**
 * Show message indicating network connectivity has been lost.
 *
 * @param  browserWindow  {BrowserWindow}   Window to host dialog
 * @param  url            {String}          Url that failed
 * @param  retryCallback  {function}        Callback when user clicks reload
 */
export const showNetworkConnectivityError = (
  browserWindow: Electron.BrowserWindow,
  url: string = '',
  retryCallback: () => void,
): void => {
  const errorDesc = i18n.t(
    'Network connectivity has been lost. Check your internet connection.',
  )();
  showLoadFailure(browserWindow, url, errorDesc, 0, retryCallback, true);
};

/**
 * Displays a dialog to get confirmation to enable/disable
 * hamburger menu
 *
 * @param isNativeStyle {boolean}
 */
export const titleBarChangeDialog = async (
  isNativeStyle: CloudConfigDataTypes,
) => {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  if (!focusedWindow || !windowExists(focusedWindow)) {
    return;
  }
  const options: MessageBoxOptions = {
    type: 'question',
    title: i18n.t('Relaunch Application')(),
    message: i18n.t(
      'Updating Title bar style requires Symphony to relaunch.',
    )(),
    detail: i18n.t(
      'Note: When Hamburger menu is disabled, you can trigger the main menu by pressing the Alt key.',
    )(),
    buttons: [i18n.t('Relaunch')(), i18n.t('Cancel')()],
    cancelId: 1,
  };
  const { response } = await dialog.showMessageBox(focusedWindow, options);
  if (response === 0) {
    logger.error(`test`, isNativeStyle);
    await config.updateUserConfig({ isCustomTitleBar: isNativeStyle });
    app.relaunch();
    app.exit();
  }
};

/**
 * Displays a dialog to restart app upon changing config settings
 * @param config
 */
export const restartDialog = async (configFields: any) => {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  if (!focusedWindow || !windowExists(focusedWindow)) {
    return;
  }
  const options: MessageBoxOptions = {
    type: 'question',
    title: i18n.t('Relaunch Application')(),
    message: i18n.t(
      'Would you like to restart and apply these new settings now?',
    )(),
    buttons: [i18n.t('Restart')(), i18n.t('Later')()],
    cancelId: 1,
  };
  const { response } = await dialog.showMessageBox(focusedWindow, options);
  await config.updateUserConfig(configFields);
  if (response === 0) {
    app.relaunch();
    app.exit();
  }
};
