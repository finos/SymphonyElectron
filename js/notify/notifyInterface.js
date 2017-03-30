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
     *  image {string} url of image to show in notification
     *  icon {string} url of image to show in notification
     *  flash {bool} true if notification should flash (default false)
     *  color {string} background color for notification
     *  groupId {string} non-empty string to unique identify notf, if another
     *    notification arrives with same groupId then it's content will
     *    replace existing notification.
     *  data {object} arbitrary object to be stored with notification
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
     * returns data object passed in via constructor options, return a
     * promise that will be fullfilled with the data.
     */
    get data() {}

    /**
     * add event listeners for 'click', 'close', 'show', 'error' events
     *
     * @param {String} event  event to listen for
     * @param {func}   cb     callback invoked when event occurs
     */
    addEventListener(event, cb) {}

    /**
     * remove event listeners for 'click', 'close', 'show', 'error' events
     *
     * @param {String} event  event to stop listening for.
     * @param {func}   cb     callback associated with original addEventListener
     */
    removeEventListener(event, cb) {}
}
/* eslint-enable */

module.exports = Notify;
