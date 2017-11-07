'use strict';

const electron = require('electron');


/**
 * Returns true if given rectangle is contained within the workArea of at
 * least one of the screens.
 * @param  {Object} rect - ex:- {x: Number, y: Number, width: Number, height: Number}
 * @return {Boolean} true if condition in desc is met.
 */
function isInDisplayBounds(rect) {
    if (!rect) {
        return false;
    }
    let displays = electron.screen.getAllDisplays();

    for(let i = 0, len = displays.length; i < len; i++) {
        let workArea = displays[i].workArea;
        if (rect.x >= workArea.x && rect.y >= workArea.y &&
            ((rect.x + rect.width) <= (workArea.x + workArea.width)) &&
            ((rect.y + rect.height) <= (workArea.y + workArea.height))) {
            return true;
        }
    }

    return false;
}

module.exports = isInDisplayBounds;
