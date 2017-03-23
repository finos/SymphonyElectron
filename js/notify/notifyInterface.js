'use strict';

/**
 * interface defn for notifications. Implementation of this interface
 * is in notifyImpl.js
 *
 * Used by preloadMain.js to create proxy for actual implementation.
 *
 * Keep interface here in sync with implementation, in order
 * to expose methods/props to renderer.
 *
 * Note: getters and method calls here return a promise.
 */

/* eslint-disable */
class Notify {
    /**
     * Dislays a notifications
     *
     * @param {String} title  Title of notification
     * @param {Object} options {
     *  body {string} main text to display in notifications
     *  image {string} url of image to show in notifications
     *  flash {bool} true if notification should flash (default false)
     *  color {string} background color for notification
     * }
     */
    constructor(title, options) {}

    /**
     * close notification
     */
    close() {}

    /**
     * This returns a promise and is always 'granted'
     * @return {promise} promise fullfilled with 'granted'
     */
    static get permission() {}

    /**
     * add event listeners for 'click' and 'close' events
     *
     * @param {String} event  event to listen for
     * @param {func}   cb     callback invoked when event occurs
     */
    addEventListener(event, cb) {}

    /**
     * remove event listeners for 'click' and 'close' events
     *
     * @param {String} event  event to stop listening for.
     * @param {func}   cb     callback associated with original addEventListener
     */
    removeEventListener(event, cb) {}
}
/* eslint-enable */

module.exports = Notify;
