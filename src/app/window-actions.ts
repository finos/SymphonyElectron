import {
  BrowserWindow,
  dialog,
  PermissionRequestHandlerHandlerDetails,
  systemPreferences,
  WebContents,
} from 'electron';

import { apiName, IBoundsChange, KeyCodes } from '../common/api-interface';
import { isLinux, isMac, isWindowsOS } from '../common/env';
import { i18n } from '../common/i18n';
import { logger } from '../common/logger';
import { throttle } from '../common/utils';
import { notification } from '../renderer/notification';
import { CloudConfigDataTypes, config } from './config-handler';
import { mainEvents } from './main-event-handler';
import { ICustomBrowserWindow, windowHandler } from './window-handler';
import { showPopupMenu, windowExists } from './window-utils';

enum Permissions {
  MEDIA = 'media',
  LOCATION = 'geolocation',
  NOTIFICATIONS = 'notifications',
  MIDI_SYSEX = 'midiSysex',
  POINTER_LOCK = 'pointerLock',
  FULL_SCREEN = 'fullscreen',
  OPEN_EXTERNAL = 'openExternal',
}
const PERMISSIONS_NAMESPACE = 'Permissions';

const saveWindowSettings = async (): Promise<void> => {
  const browserWindow = BrowserWindow.getFocusedWindow() as ICustomBrowserWindow;
  const mainWebContents = windowHandler.getMainWebContents();

  if (browserWindow && windowExists(browserWindow)) {
    let [x, y] = browserWindow.getPosition();
    let [width, height] = browserWindow.getSize();
    if (x && y && width && height) {
      // Only send bound changes over to client for pop-out windows
      if (
        browserWindow.winName !== apiName.mainWindowName &&
        mainWebContents &&
        !mainWebContents.isDestroyed()
      ) {
        const boundsChange: IBoundsChange = {
          x,
          y,
          width,
          height,
          windowName: browserWindow.winName,
        };
        mainWebContents.send('boundsChange', boundsChange);
      }

      // Update the config file
      if (browserWindow.winName === apiName.mainWindowName) {
        const isMaximized = browserWindow.isMaximized();
        const isFullScreen = browserWindow.isFullScreen();
        const { mainWinPos } = config.getUserConfigFields(['mainWinPos']);

        if (isMaximized || isFullScreen) {
          // Keep the original size and position when window is maximized or full screen
          if (
            mainWinPos !== undefined &&
            mainWinPos.x !== undefined &&
            mainWinPos.y !== undefined &&
            mainWinPos.width !== undefined &&
            mainWinPos.height !== undefined
          ) {
            x = mainWinPos.x;
            y = mainWinPos.y;
            width = mainWinPos.width;
            height = mainWinPos.height;
          }
        }

        await config.updateUserConfig({
          mainWinPos: {
            ...mainWinPos,
            ...{ height, width, x, y, isMaximized, isFullScreen },
          },
        });
      }
    }
  }
};

const windowMaximized = async (): Promise<void> => {
  const browserWindow = BrowserWindow.getFocusedWindow() as ICustomBrowserWindow;
  if (browserWindow && windowExists(browserWindow)) {
    const isMaximized = browserWindow.isMaximized();
    const isFullScreen = browserWindow.isFullScreen();
    if (browserWindow.winName === apiName.mainWindowName) {
      const { mainWinPos } = config.getUserConfigFields(['mainWinPos']);
      await config.updateUserConfig({
        mainWinPos: { ...mainWinPos, ...{ isMaximized, isFullScreen } },
      });
    }
  }
};

const throttledWindowChanges = throttle(async (eventName, window) => {
  await saveWindowSettings();
  await windowMaximized();
  notification.moveNotificationToTop();
  if (
    window &&
    (window as ICustomBrowserWindow).winName === apiName.mainWindowName
  ) {
    const isMaximized = window.isMaximized();
    mainEvents.publish(eventName, isMaximized);
  }
}, 300);

const throttledWindowRestore = throttle(async () => {
  notification.moveNotificationToTop();
  const mainWebContents = windowHandler.getMainWebContents();
  if (isWindowsOS) {
    if (mainWebContents && !mainWebContents.isDestroyed()) {
      mainWebContents.focus();
    }
  }
}, 1000);

/**
 * Sends initial bound changes for pop-out windows
 *
 * @param childWindow {BrowserWindow} - window created via new-window event
 */
export const sendInitialBoundChanges = (childWindow: BrowserWindow): void => {
  logger.info(`window-actions: Sending initial bounds`);
  const mainWindow = windowHandler.getMainWindow();
  if (!mainWindow || !windowExists(mainWindow)) {
    return;
  }

  if (!childWindow || !windowExists(childWindow)) {
    logger.error(
      `window-actions: child window has already been destroyed - not sending bound change`,
    );
    return;
  }
  const { x, y, width, height } = childWindow.getBounds();
  const windowName = (childWindow as ICustomBrowserWindow).winName;
  const boundsChange: IBoundsChange = {
    x,
    y,
    width,
    height,
    windowName,
  };
  mainWindow.webContents.send('boundsChange', boundsChange);
  logger.info(
    `window-actions: Initial bounds sent for ${
      (childWindow as ICustomBrowserWindow).winName
    }`,
    { x, y, width, height },
  );
};

/**
 * Tries finding a window we have created with given name.  If found, then
 * brings to front and gives focus.
 *
 * @param  {string} windowName   Name of target window. Note: main window has
 * name 'main'.
 * @param {Boolean} shouldFocus  whether to get window to focus or just show
 * without giving focus
 */
export const activate = (
  windowName: string,
  shouldFocus: boolean = true,
): void => {
  // Electron-136: don't activate when the app is reloaded programmatically
  if (windowHandler.isAutoReload) {
    return;
  }

  const windows = windowHandler.getAllWindows();
  for (const key in windows) {
    if (Object.prototype.hasOwnProperty.call(windows, key)) {
      const window = windows[key];
      if (window && !window.isDestroyed() && window.winName === windowName) {
        // Bring the window to the top without focusing
        // Flash task bar icon in Windows for windows
        if (!shouldFocus) {
          return isMac || isLinux
            ? window.showInactive()
            : window.flashFrame(true);
        }

        // Note: On window just focusing will preserve window snapped state
        // Hiding the window and just calling the focus() won't display the window
        if (isWindowsOS) {
          return window.isMinimized() ? window.restore() : window.focus();
        }

        return window.isMinimized() ? window.restore() : window.show();
      }
    }
  }
};

/**
 * Sets always on top property based on isAlwaysOnTop
 *
 * @param shouldSetAlwaysOnTop {boolean} - Whether to enable always on top or not
 * @param shouldActivateMainWindow {boolean} - Whether to active main window
 * @param shouldUpdateUserConfig {boolean} - whether to update config file
 */
export const updateAlwaysOnTop = async (
  shouldSetAlwaysOnTop: boolean,
  shouldActivateMainWindow: boolean = true,
  shouldUpdateUserConfig: boolean = true,
): Promise<void> => {
  logger.info(
    `window-actions: Should we set always on top? ${shouldSetAlwaysOnTop}!`,
  );
  const browserWins: ICustomBrowserWindow[] = BrowserWindow.getAllWindows() as ICustomBrowserWindow[];
  if (shouldUpdateUserConfig) {
    await config.updateUserConfig({
      alwaysOnTop: shouldSetAlwaysOnTop
        ? CloudConfigDataTypes.ENABLED
        : CloudConfigDataTypes.NOT_SET,
    });
  }
  if (browserWins.length > 0) {
    browserWins
      .filter((browser) => typeof browser.notificationData !== 'object')
      .forEach((browser) => browser.setAlwaysOnTop(shouldSetAlwaysOnTop));

    // An issue where changing the alwaysOnTop property
    // focus the pop-out window
    // Issue - Electron-209/470
    const mainWindow = windowHandler.getMainWindow();
    if (mainWindow && mainWindow.winName && shouldActivateMainWindow) {
      activate(mainWindow.winName);
      logger.info(`window-actions: activated main window!`);
    }
  }
};

/**
 * Method that handles key press
 *
 * @param key {number}
 */
export const handleKeyPress = (key: number): void => {
  switch (key) {
    case KeyCodes.Esc: {
      const focusedWindow = BrowserWindow.getFocusedWindow();

      if (
        focusedWindow &&
        !focusedWindow.isDestroyed() &&
        focusedWindow.isFullScreen()
      ) {
        logger.info(`window-actions: exiting fullscreen by esc key action`);
        focusedWindow.setFullScreen(false);
      }
      break;
    }
    case KeyCodes.Alt:
      if (isMac || isLinux) {
        return;
      }
      const browserWin = BrowserWindow.getFocusedWindow() as ICustomBrowserWindow;
      if (
        browserWin &&
        windowExists(browserWin) &&
        browserWin.winName === apiName.mainWindowName
      ) {
        logger.info(`window-actions: popping up menu by alt key action`);
        showPopupMenu({ window: browserWin });
      }
      break;
    default:
      break;
  }
};

/**
 * Sets the window to always on top based
 * on fullscreen state
 */
const setSpecificAlwaysOnTop = () => {
  const browserWindow = BrowserWindow.getFocusedWindow();
  if (
    isMac &&
    browserWindow &&
    windowExists(browserWindow) &&
    browserWindow.isAlwaysOnTop()
  ) {
    // Set the focused window's always on top level based on fullscreen state
    browserWindow.setAlwaysOnTop(
      true,
      browserWindow.isFullScreen() ? 'modal-panel' : 'floating',
    );
  }
};

/**
 * Monitors window actions
 *
 * @param window {BrowserWindow}
 */
export const monitorWindowActions = (window: BrowserWindow): void => {
  if (!window || window.isDestroyed()) {
    return;
  }
  const eventNames = ['move', 'resize'];
  eventNames.forEach((event: string) => {
    if (window) {
      // @ts-ignore
      window.on(event, () => throttledWindowChanges(event, window));
    }
  });
  window.on('enter-full-screen', () =>
    throttledWindowChanges('enter-full-screen', window),
  );
  window.on('maximize', () => throttledWindowChanges('maximize', window));

  window.on('leave-full-screen', () =>
    throttledWindowChanges('leave-full-screen', window),
  );
  window.on('unmaximize', () => throttledWindowChanges('unmaximize', window));

  if ((window as ICustomBrowserWindow).winName === apiName.mainWindowName) {
    window.on('restore', throttledWindowRestore);
  }

  // Workaround for an issue with MacOS + AlwaysOnTop
  // Issue: SDA-1665
  if (isMac) {
    window.on('enter-full-screen', setSpecificAlwaysOnTop);
    window.on('leave-full-screen', setSpecificAlwaysOnTop);
  }
};

/**
 * Removes attached event listeners
 *
 * @param window
 */
export const removeWindowEventListener = (window: BrowserWindow): void => {
  if (!window || window.isDestroyed()) {
    return;
  }
  const eventNames = ['move', 'resize'];
  eventNames.forEach((event: string) => {
    if (window) {
      // @ts-ignore
      window.removeListener(event, throttledWindowChanges);
    }
  });
  window.removeListener('enter-full-screen', throttledWindowChanges);
  window.removeListener('maximize', throttledWindowChanges);

  window.removeListener('leave-full-screen', throttledWindowChanges);
  window.removeListener('unmaximize', throttledWindowChanges);

  // Workaround for and issue with MacOS + AlwaysOnTop
  // Issue: SDA-1665
  if (isMac) {
    window.removeListener('enter-full-screen', setSpecificAlwaysOnTop);
    window.removeListener('leave-full-screen', setSpecificAlwaysOnTop);
  }
};

/**
 * Verifies the permission and display a
 * dialog if the action is not enabled
 *
 * @param permission {boolean} - config value to a specific permission
 * @param message {string} - custom message displayed to the user
 * @param callback {function}
 */
export const handleSessionPermissions = async (
  permission: boolean,
  message: string,
  callback: (permission: boolean) => void,
): Promise<void> => {
  logger.info(`window-action: permission is ->`, { type: message, permission });

  if (!permission) {
    const browserWindow = BrowserWindow.getFocusedWindow();
    if (browserWindow && !browserWindow.isDestroyed()) {
      const response = await dialog.showMessageBox(browserWindow, {
        type: 'error',
        title: `${i18n.t('Permission Denied')()}!`,
        message,
      });
      logger.error(
        `window-actions: permissions message box closed with response`,
        response,
      );
    }
  }

  return callback(permission);
};

/**
 * Modified version of handleSessionPermissions that takes an additional details param.
 *
 * Verifies the permission both against SDA permissions, and systemPermissions (macOS only).
 * Displays a dialog if permission is disabled by administrator
 *
 * @param permission {boolean} - config value to a specific permission (only supports media permissions)
 * @param message {string} - custom message displayed to the user
 * @param callback {function}
 * @param details {PermissionRequestHandlerHandlerDetails} - object passed along with certain permission types. see {@link https://www.electronjs.org/docs/api/session#sessetpermissionrequesthandlerhandler}
 */
const handleMediaPermissions = async (
  permission: boolean,
  message: string,
  callback: (permission: boolean) => void,
  details: PermissionRequestHandlerHandlerDetails,
): Promise<void> => {
  logger.info('window-action: permission is ->', permission);
  let systemAudioPermission;
  let systemVideoPermission;
  if (isMac) {
    systemAudioPermission = await systemPreferences.askForMediaAccess(
      'microphone',
    );
    systemVideoPermission = await systemPreferences.askForMediaAccess('camera');
  } else {
    systemAudioPermission = true;
    systemVideoPermission = true;
  }

  if (!permission) {
    const browserWindow = BrowserWindow.getFocusedWindow();
    if (browserWindow && !browserWindow.isDestroyed()) {
      const response = await dialog.showMessageBox(browserWindow, {
        type: 'error',
        title: `${i18n.t('Permission Denied')()}!`,
        message,
      });
      logger.error(
        `window-actions: permissions message box closed with response`,
        response,
      );
    }
  }

  if (details.mediaTypes && isMac) {
    if (details.mediaTypes.includes('audio') && !systemAudioPermission) {
      return callback(false);
    }
    if (details.mediaTypes.includes('video') && !systemVideoPermission) {
      return callback(false);
    }
  }

  return callback(permission);
};

/**
 * Sets permission requests for the window
 *
 * @param webContents {WeContents}
 */
export const handlePermissionRequests = (webContents: WebContents): void => {
  if (!webContents || !webContents.session) {
    return;
  }
  const { session } = webContents;

  const { permissions } = config.getConfigFields(['permissions']);
  if (!permissions) {
    logger.error(
      'permissions configuration is invalid, so, everything will be true by default!',
    );
    return;
  }

  session.setPermissionRequestHandler(
    (_webContents, permission, callback, details) => {
      switch (permission) {
        case Permissions.MEDIA:
          return handleMediaPermissions(
            permissions.media,
            i18n.t(
              'Your administrator has disabled sharing your camera, microphone, and speakers. Please contact your admin for help',
              PERMISSIONS_NAMESPACE,
            )(),
            callback,
            details,
          );
        case Permissions.LOCATION:
          return handleSessionPermissions(
            permissions.geolocation,
            i18n.t(
              'Your administrator has disabled sharing your location. Please contact your admin for help',
              PERMISSIONS_NAMESPACE,
            )(),
            callback,
          );
        case Permissions.NOTIFICATIONS:
          return handleSessionPermissions(
            permissions.notifications,
            i18n.t(
              'Your administrator has disabled notifications. Please contact your admin for help',
              PERMISSIONS_NAMESPACE,
            )(),
            callback,
          );
        case Permissions.MIDI_SYSEX:
          return handleSessionPermissions(
            permissions.midiSysex,
            i18n.t(
              'Your administrator has disabled MIDI Sysex. Please contact your admin for help',
              PERMISSIONS_NAMESPACE,
            )(),
            callback,
          );
        case Permissions.POINTER_LOCK:
          return handleSessionPermissions(
            permissions.pointerLock,
            i18n.t(
              'Your administrator has disabled Pointer Lock. Please contact your admin for help',
              PERMISSIONS_NAMESPACE,
            )(),
            callback,
          );
        case Permissions.FULL_SCREEN:
          return handleSessionPermissions(
            permissions.fullscreen,
            i18n.t(
              'Your administrator has disabled Full Screen. Please contact your admin for help',
              PERMISSIONS_NAMESPACE,
            )(),
            callback,
          );
        case Permissions.OPEN_EXTERNAL:
          if (
            details?.externalURL?.startsWith('symphony:') ||
            details?.externalURL?.startsWith('mailto:')
          ) {
            return callback(true);
          }
          return handleSessionPermissions(
            permissions.openExternal,
            i18n.t(
              'Your administrator has disabled Opening External App. Please contact your admin for help',
              PERMISSIONS_NAMESPACE,
            )(),
            callback,
          );
        default:
          return callback(false);
      }
    },
  );
};

/**
 * Writes renderer logs to log file
 * @param _event
 * @param level
 * @param message
 * @param _line
 * @param _sourceId
 */
export const onConsoleMessages = (_event, level, message, _line, _sourceId) => {
  if (level === 0) {
    logger.log('error', `renderer: ${message}`, [], false);
  } else if (level === 1) {
    logger.log('info', `renderer: ${message}`, [], false);
  } else if (level === 2) {
    logger.log('warn', `renderer: ${message}`, [], false);
  } else if (level === 3) {
    logger.log('error', `renderer: ${message}`, [], false);
  } else {
    logger.log('info', `renderer: ${message}`, [], false);
  }
};

/**
 * Unregisters renderer logs from all the available browser window
 */
export const unregisterConsoleMessages = () => {
  const browserWindows = BrowserWindow.getAllWindows();
  for (const browserWindow of browserWindows) {
    if (!browserWindow || !windowExists(browserWindow)) {
      return;
    }
    browserWindow.webContents.removeListener(
      'console-message',
      onConsoleMessages,
    );
  }
};

/**
 * registers renderer logs from all the available browser window
 */
export const registerConsoleMessages = () => {
  const browserWindows = BrowserWindow.getAllWindows();
  for (const browserWindow of browserWindows) {
    if (!browserWindow || !windowExists(browserWindow)) {
      return;
    }
    browserWindow.webContents.on('console-message', onConsoleMessages);
  }
};
