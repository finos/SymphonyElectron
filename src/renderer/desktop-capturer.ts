import {
  desktopCapturer,
  DesktopCapturerSource,
  ipcRenderer,
  remote,
  SourcesOptions,
} from 'electron';

import {
  apiCmds,
  apiName,
  NOTIFICATION_WINDOW_TITLE,
} from '../common/api-interface';
import { isWindowsOS } from '../common/env';
import { i18n } from '../common/i18n-preload';

const includes = [''].includes;

let nextId = 0;
let isScreenShareEnabled = false;
let screenShareArgv: string;

export interface ICustomSourcesOptions extends SourcesOptions {
  requestId?: number;
}

export interface ICustomDesktopCapturerSource extends DesktopCapturerSource {
  requestId: number | undefined;
}

export interface IScreenSourceError {
  name: string;
  message: string;
  requestId: number | undefined;
}

export type CallbackType = (
  error: IScreenSourceError | null,
  source?: ICustomDesktopCapturerSource,
) => void;
const getNextId = () => ++nextId;

/**
 * Checks if the options and their types are valid
 * @param options |options.type| can not be empty and has to include 'window' or 'screen'.
 * @returns {boolean}
 */
const isValid = (options: ICustomSourcesOptions) => {
  return (
    (options !== null ? options.types : undefined) !== null &&
    Array.isArray(options.types)
  );
};

/**
 * Gets the sources for capturing screens / windows
 *
 * @param options {SourcesOptions}
 * @param callback {CallbackType}
 * @returns {*}
 */
export const getSource = async (
  options: ICustomSourcesOptions,
  callback: CallbackType,
) => {
  let captureWindow;
  let captureScreen;
  let id;
  const sourcesOpts: string[] = [];
  const { requestId, ...updatedOptions } = options;
  if (!isValid(options)) {
    callback({
      name: 'Invalid options',
      message: 'Invalid options',
      requestId,
    });
    return;
  }
  captureWindow = includes.call(options.types, 'window');
  captureScreen = includes.call(options.types, 'screen');

  if (!updatedOptions.thumbnailSize) {
    updatedOptions.thumbnailSize = {
      height: 150,
      width: 150,
    };
  }

  if (isWindowsOS && captureWindow) {
    /**
     * Sets the captureWindow to false if Desktop composition
     * is disabled otherwise true
     *
     * Setting captureWindow to false returns only screen sources
     * @type {boolean}
     */
    captureWindow = remote.systemPreferences.isAeroGlassEnabled();
  }

  if (captureWindow) {
    sourcesOpts.push('window');
  }
  if (captureScreen) {
    sourcesOpts.push('screen');
  }

  // displays a dialog if media permissions are disable
  if (!isScreenShareEnabled) {
    const focusedWindow = remote.BrowserWindow.getFocusedWindow();
    if (focusedWindow && !focusedWindow.isDestroyed()) {
      remote.dialog.showMessageBox(focusedWindow, {
        message: `${i18n.t(
          'Your administrator has disabled sharing your screen. Please contact your admin for help',
          'Permissions',
        )()}`,
        title: `${i18n.t('Permission Denied')()}!`,
        type: 'error',
      });
      callback({
        name: 'Permission Denied',
        message: 'Permission Denied',
        requestId,
      });
      return;
    }
  }

  id = getNextId();
  const sources: DesktopCapturerSource[] = await desktopCapturer.getSources({
    types: sourcesOpts,
    thumbnailSize: updatedOptions.thumbnailSize,
  });
  // Auto select screen source based on args for testing only
  if (screenShareArgv) {
    const title = screenShareArgv.substr(screenShareArgv.indexOf('=') + 1);
    const filteredSource: DesktopCapturerSource[] = sources.filter(
      (source) => source.name === title,
    );

    if (Array.isArray(filteredSource) && filteredSource.length > 0) {
      const source = { ...filteredSource[0], requestId };
      return callback(null, source);
    }

    if (sources.length > 0) {
      const firstSource = { ...sources[0], requestId };
      return callback(null, firstSource);
    }
  }

  const updatedSources = sources
    .filter((source) => source.name !== NOTIFICATION_WINDOW_TITLE)
    .map((source) => {
      return {
        ...source,
        ...{
          thumbnail: source.thumbnail.toDataURL(),
        },
      };
    });

  ipcRenderer.send(apiName.symphonyApi, {
    cmd: apiCmds.openScreenPickerWindow,
    id,
    sources: updatedSources,
  });

  const successCallback = (_e, source: DesktopCapturerSource) => {
    // Cleaning up the event listener to prevent memory leaks
    if (!source) {
      ipcRenderer.removeListener('start-share' + id, successCallback);
      return callback({
        name: 'User Cancelled',
        message: 'User Cancelled',
        requestId,
      });
    }
    return callback(null, { ...source, ...{ requestId } });
  };
  ipcRenderer.once('start-share' + id, successCallback);
  return null;
};

// event that updates screen share argv
ipcRenderer.once('screen-share-argv', (_event, arg) => {
  if (typeof arg === 'string') {
    screenShareArgv = arg;
  }
});

// event that updates screen share permission
ipcRenderer.on('is-screen-share-enabled', (_event, canShareScreen) => {
  if (typeof canShareScreen === 'boolean' && canShareScreen) {
    isScreenShareEnabled = canShareScreen;
  }
});
