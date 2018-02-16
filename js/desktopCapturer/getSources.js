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

const { ipcRenderer, remote } = require('electron');
const apiEnums = require('../enums/api.js');
const apiCmds = apiEnums.cmds;
const apiName = apiEnums.apiName;
const { isWindowsOS } = require('../utils/misc');
const USER_CANCELLED = 'User Cancelled';

let nextId = 0;
let includes = [].includes;

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
function getSources(options, callback) {
    let captureScreen, captureWindow, id;
    if (!isValid(options)) {
        return callback(new Error('Invalid options'));
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

    if (isWindowsOS) {
        /**
         * Sets the captureWindow to false if Desktop composition
         * is disabled otherwise true
         *
         * Setting captureWindow to false returns only screen sources
         * @type {boolean}
         */
        captureWindow = remote.systemPreferences.isAeroGlassEnabled();
    }

    id = getNextId();
    ipcRenderer.send('ELECTRON_BROWSER_DESKTOP_CAPTURER_GET_SOURCES', captureWindow, captureScreen, updatedOptions.thumbnailSize, id);

    ipcRenderer.once('ELECTRON_RENDERER_DESKTOP_CAPTURER_RESULT_' + id, function(event, sources) {

        ipcRenderer.send(apiName, {
            cmd: apiCmds.openScreenPickerWindow,
            sources: sources,
            id: id
        });

        function successCallback(e, source) {
            // Cleaning up the event listener to prevent memory leaks
            if (!source) {
                ipcRenderer.removeListener('stat-share' + id, func);
                return callback(new Error(USER_CANCELLED));
            }
            return callback(null, source);
        }

        const func = successCallback.bind(this);
        ipcRenderer.once('start-share' + id, func);
    });
}

module.exports = getSources;