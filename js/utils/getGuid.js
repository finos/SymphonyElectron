'use strict';

/**
 * Generates a guid,
 * http://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
 *
 * @return {String} guid value in string
 */
function getGuid() {
    const guid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,
        function(c) {
            var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    return guid;
}

module.exports = getGuid;
