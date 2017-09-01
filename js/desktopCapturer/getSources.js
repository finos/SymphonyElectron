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

const { ipcRenderer } = require('electron');

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

    id = getNextId();
    ipcRenderer.send('ELECTRON_BROWSER_DESKTOP_CAPTURER_GET_SOURCES', captureWindow, captureScreen, updatedOptions.thumbnailSize, id);

    return ipcRenderer.once('ELECTRON_RENDERER_DESKTOP_CAPTURER_RESULT_' + id, function(event, sources) {
        let source;
        callback(null, (function() {
            let i, len, results;
            results = [];
            for (i = 0, len = sources.length; i < len; i++) {
                source = sources[i];
                results.push({
                    id: source.id,
                    name: source.name,
                    thumbnail: source.thumbnail
                });
            }

            return results;

        }()));
    });
}

module.exports = getSources;