'use strict';

const EventEmitter = require('events');
const { notify } = require('./electron-notify.js');
const log = require('../log.js');
const logLevels = require('../enums/logLevels.js');
/**
 * implementation for notifications interface,
 * wrapper around electron-notify.
 */
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
     *  tag {string} non-empty string to unique identify notf, if another
     *    notification arrives with same tag then it's content will
     *    replace existing notification.
     *  sticky {bool} if true notification will stay until user closes. default
     *     is false.
     *  data {object} arbitrary object to be stored with notification
     * }
     */
    constructor(title, options) {
        log.send(logLevels.INFO, 'creating notification, text=' + options.body);

        let emitter = new EventEmitter();
        this.emitter = Queue(emitter);

        this._id = notify({
            title: title,
            text: options.body,
            image: options.image || options.icon,
            flash: options.flash,
            color: options.color,
            tag: options.tag,
            sticky: options.sticky || false,
            onShowFunc: onShow.bind(this),
            onClickFunc: onClick.bind(this),
            onCloseFunc: onClose.bind(this),
            onErrorFunc: onError.bind(this)
        });

        log.send(logLevels.INFO, 'created notification, id=' + this._id + ', text=' + options.body);

        this._data = options.data || null;

        /**
         * Handles on show event
         * @param arg
         */
        function onShow(arg) {
            if (arg.id === this._id) {
                log.send(logLevels.INFO, 'showing notification, id=' + this._id);
                this.emitter.queue('show', {
                    target: this
                });
                this._closeNotification = arg.closeNotification;
            }
        }

        /**
         * Handles on click event
         * @param arg
         */
        function onClick(arg) {
            if (arg.id === this._id) {
                log.send(logLevels.INFO, 'clicking notification, id=' + this._id);
                this.emitter.queue('click', {
                    target: this
                });
            }
        }

        /**
         * Handles on close event
         * @param arg
         */
        function onClose(arg) {
            if (arg.id === this._id || arg.event === 'close-all') {
                log.send(logLevels.INFO, 'closing notification, id=' + this._id);
                this.emitter.queue('close', {
                    target: this
                });
                this.destroy();
            }
        }

        /**
         * Handles on error event
         * @param arg
         */
        function onError(arg) {
            if (arg.id === this._id) {
                // don't raise error event if handler doesn't exist, node
                // will throw an exception
                log.send(logLevels.ERROR, 'error for notification, id=' + this._id +
                    ' error=' + (arg && arg.error));
                if (this.emitter.eventNames().includes('error')) {
                    this.emitter.queue('error', arg.error || 'notification error');
                }
                this.destroy();
            }
        }
    }

    /**
     * Closes notification
     */
    close() {
        if (typeof this._closeNotification === 'function') {
            this._closeNotification('close');
        }
        this.destroy();
    }

    /**
     * Always allow showing notifications.
     * @return {string} 'granted'
     */
    static get permission() {
        return 'granted';
    }

    /**
     * Returns data object passed in via constructor options
     */
    get data() {
        return this._data;
    }

    /**
     * Adds event listeners for 'click', 'close', 'show', 'error' events
     *
     * @param {String} event  event to listen for
     * @param {func}   cb     callback invoked when event occurs
     */
    addEventListener(event, cb) {
        if (event && typeof cb === 'function') {
            this.emitter.on(event, cb);
        }
    }

    /**
     * Removes event listeners for 'click', 'close', 'show', 'error' events
     *
     * @param {String} event  event to stop listening for.
     * @param {func}   cb     callback associated with original addEventListener
     */
    removeEventListener(event, cb) {
        if (event && typeof cb === 'function') {
            this.emitter.removeListener(event, cb);
        }
    }

    /**
     * Removes all event listeners
     */
    removeAllEvents() {
        this.destroy();
    }

    //
    // private stuff below here
    //
    destroy() {
        this.emitter.removeAllListeners();
    }

}

/**
 * Allow emitter events to be queued before addEventListener called.
 * Code adapted from: https://github.com/bredele/emitter-queue
 *
 * @param {Object} emitter Instance of node emitter that will get augmented.
 * @return {Object} Modified emitter
 */
function Queue(emitter) {
    /**
     * Cache emitter on.
     * @api private
     */
    const cache = emitter.on;
    let modifiedEmitter = emitter;
    /**
    * Emit event and store it if no
    * defined callbacks.
    * example:
    *
    *   .queue('message', 'hi');
    *
    * @param {String} topic
    */
    modifiedEmitter.queue = function(topic) {
        this._queue = this._queue || {};
        this._callbacks = this._callbacks || {};
        if (this._callbacks[topic]) {
            this.emit.apply(this, arguments);
        } else {
            (this._queue[topic] = this._queue[topic] || [])
            .push([].slice.call(arguments, 1));
        }
    };

    /**
    * Listen on the given `event` with `fn`.
    *
    * @param {String} event
    * @param {Function} fn
    * @return {Event}
    */
    modifiedEmitter.on = modifiedEmitter.addEventListener = function(topic, fn) {
        this._queue = this._queue || {};
        const topics = this._queue[topic];
        cache.apply(this, arguments);

        if (!this._callbacks) {
            this._callbacks = {};
        }
        this._callbacks[topic] = true;

        if (topics) {
            let i = 0;
            const l = topics.length;
            for(; i < l; i++) {
                fn.apply(this, topics[i]);
            }
            delete this._queue[topic];
        }
    };

    return modifiedEmitter;
}

module.exports = Notify;
