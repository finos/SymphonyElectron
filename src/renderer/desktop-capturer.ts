import {
    desktopCapturer,
    DesktopCapturerSource,
    ipcRenderer,
    remote,
    SourcesOptions,
} from 'electron';

import { apiCmds, apiName } from '../common/api-interface';
import { isWindowsOS } from '../common/env';
import { i18n } from '../common/i18n-preload';

const includes = [].includes;

let nextId = 0;
// TODO: add logic to check for permissions
let isScreenShareEnabled = true;
let screenShareArgv: string;

type CallbackType = (error: Error | null, source?: DesktopCapturerSource) => DesktopCapturerSource | Error;
const getNextId = () => ++nextId;

/**
 * Checks if the options and their types are valid
 * @param options |options.type| can not be empty and has to include 'window' or 'screen'.
 * @returns {boolean}
 */
const isValid = (options: SourcesOptions) => {
    return ((options !== null ? options.types : undefined) !== null) && Array.isArray(options.types);
};

/**
 * Gets the sources for capturing screens / windows
 *
 * @param options {SourcesOptions}
 * @param callback {CallbackType}
 * @returns {*}
 */
export const getSource = (options: SourcesOptions, callback: CallbackType) => {
    let captureWindow;
    let captureScreen;
    let id;
    const sourcesOpts: string[] = [];
    if (!isValid(options)) {
        callback(new Error('Invalid options'));
        return;
    }
    captureWindow = includes.call(options.types, 'window');
    captureScreen = includes.call(options.types, 'screen');

    const updatedOptions = options;
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
                message: i18n.t('Your administrator has disabled screen share. Please contact your admin for help')(),
                title: `${i18n.t('Permission Denied')()}!`,
                type: 'error',
            });
            callback(new Error('Permission Denied'));
            return;
        }
    }

    id = getNextId();
    desktopCapturer.getSources({ types: sourcesOpts, thumbnailSize: updatedOptions.thumbnailSize }, (_event, sources: DesktopCapturerSource[]) => {

        // Auto select screen source based on args for testing only
        if (screenShareArgv) {
            const title = screenShareArgv.substr(screenShareArgv.indexOf('=') + 1);
            const filteredSource: DesktopCapturerSource[] = sources.filter((source) => source.name === title);

            if (Array.isArray(filteredSource) && filteredSource.length > 0) {
                return callback(null, filteredSource[ 0 ]);
            }

            if (sources.length > 0) {
                return callback(null, sources[ 0 ]);
            }

        }

        const updatedSources = sources.map((source) => {
            return Object.assign({}, source, {
                thumbnail: source.thumbnail.toDataURL(),
            });
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
                return callback(new Error('User Cancelled'));
            }
            return callback(null, source);
        };
        ipcRenderer.once('start-share' + id, successCallback);
        return null;
    });
};

// event that updates screen share argv
ipcRenderer.once('screen-share-argv', (_event, arg) => {
    if (typeof arg === 'string') {
        screenShareArgv = arg;
    }
});

// event that updates screen share permission
ipcRenderer.on('is-screen-share-enabled', (_event, screenShare) => {
    if (typeof screenShare === 'boolean' && screenShare) {
        isScreenShareEnabled = true;
    }
});