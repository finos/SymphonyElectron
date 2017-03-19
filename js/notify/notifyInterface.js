'use strict';

/**
 * interface defn for notifications. no implementation here.
 *
 * Used by preload to create proxy for actual implementation.
 *
 * Keep interface here in sync with implementation, in order
 * to expose methods/props to renderer.
 */
class Notify {
    constructor(title, options) {}

    close() {}

    destroy() {}

    static get permission() {}

    addEventListener(event, cb) {}

    removeEventListener(event, cb) {}
}

module.exports = Notify;
