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

const { remote, desktopCapturer } = require('electron');
const { isWindowsOS } = require('../utils/misc');

let includes = [].includes;

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
    let captureScreen, captureWindow;
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
    if (captureWindow) {
        sourceTypes.push('window');
    }
    if (captureScreen) {
        sourceTypes.push('screen');
    }

    desktopCapturer.getSources({ types: sourceTypes, thumbnailSize: updatedOptions.thumbnailSize }, (event, sources) => {
        let source;
        callback(null, (function() {
            let i, len, results;
            results = [];
            for (i = 0, len = sources.length; i < len; i++) {
                source = sources[i];
                results.push({
                    id: source.id,
                    name: source.name,
                    thumbnail: source.thumbnail.toDataURL()
                });
            }

            return results;

        }()));
    });
}

/**
 * @deprecated instead use getSource
 * @type {getSources}
 */
module.exports = getSources;