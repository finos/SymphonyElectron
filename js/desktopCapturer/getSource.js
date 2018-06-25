'use strict';

// This code provides equivalent of desktopCapturer.getSources that works in
// a sandbox renderer. see: https://electron.atom.io/docs/api/desktop-capturer/
//
// The code here is not entirely kosher/stable as it is using private ipc
// events.  The code was take directly from electron.asar file provided in
// prebuilt node module.  Note: the slight difference here is the thumbnail
// returns a base64 encoded image rather than a electron nativeImage.
//
// Until electron provides access to desktopCapturer in a sandboxed
// renderer process, this will have to do.  See github issue posted here to
// electron: https://github.com/electron/electron/issues/9312

const { ipcRenderer, remote, desktopCapturer } = require('electron');
const apiEnums = require('../enums/api.js');
const apiCmds = apiEnums.cmds;
const apiName = apiEnums.apiName;
const { isWindowsOS } = require('../utils/misc');
const USER_CANCELLED = 'User Cancelled';

let nextId = 0;
let includes = [].includes;
let screenShareArgv;

function getNextId() {
    return ++nextId;
}

/**
 * Checks if the options and their types are valid
 * @param options |options.type| can not be empty and has to include 'window' or 'screen'.
 * @returns {boolean}
 */
function isValid(options) {
    return ((options !== null ? options.types : undefined) !== null) && Array.isArray(options.types);
}

/**
 * Gets the sources for capturing screens / windows
 * @param options
 * @param callback
 * @returns {*}
 */
function getSource(options, callback) {
    let captureScreen, captureWindow, id;
    let sourceTypes = [];
    if (!isValid(options)) {
        callback(new Error('Invalid options'));
        return;
    }
    captureWindow = includes.call(options.types, 'window');
    captureScreen = includes.call(options.types, 'screen');

    let updatedOptions = options;
    if (!updatedOptions.thumbnailSize) {
        updatedOptions.thumbnailSize = {
            width: 150,
            height: 150
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
        sourceTypes.push('window');
    }
    if (captureScreen) {
        sourceTypes.push('screen');
    }

    id = getNextId();
    desktopCapturer.getSources({ types: sourceTypes, thumbnailSize: updatedOptions.thumbnailSize }, (event, sources) => {

        if (screenShareArgv) {
            const title = screenShareArgv.substr(screenShareArgv.indexOf('=') + 1);
            const filteredSource = sources.filter(source => source.name === title);

            if (Array.isArray(filteredSource) && filteredSource.length > 0) {
                return callback(null, filteredSource[0]);
            }

            if (typeof filteredSource === 'object' && filteredSource.name) {
                return callback(null, filteredSource);
            }

            if (sources.length > 0) {
                return callback(null, sources[0]);
            }

        }

        const updatedSources = sources.map(source => {
            return Object.assign({}, source, {
                thumbnail: source.thumbnail.toDataURL()
            });
        });

        ipcRenderer.send(apiName, {
            cmd: apiCmds.openScreenPickerWindow,
            sources: updatedSources,
            id: id
        });

        function successCallback(e, source) {
            // Cleaning up the event listener to prevent memory leaks
            if (!source) {
                ipcRenderer.removeListener('start-share' + id, func);
                return callback(new Error(USER_CANCELLED));
            }
            return callback(null, source);
        }

        const func = successCallback.bind(this);
        ipcRenderer.once('start-share' + id, func);
        return null;
    });
}

// event that updates screen share argv
ipcRenderer.once('screen-share-argv', (event, arg) => {
    if (typeof arg === 'string') {
        screenShareArgv = arg;
    }
});

module.exports = getSource;