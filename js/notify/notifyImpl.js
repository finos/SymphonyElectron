'use strict';

const EventEmitter = require('events');
const { notify } = require('./electron-notify.js');

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
        this.emitter = new EventEmitter();

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

        this._data = options.data || null;

        function onShow(arg) {
            if (arg.id === this._id) {
                this.emitter.emit('show');
                this._closeNotification = arg.closeNotification;
            }
        }

        function onClick(arg) {
            if (arg.id === this._id) {
                this.emitter.emit('click', {
                    target: this
                });
            }
        }

        function onClose(arg) {
            if (arg.id === this._id || arg.event === 'close-all') {
                this.emitter.emit('close', {
                    target: this
                });
                this.destroy();
            }
        }

        function onError(arg) {
            if (arg.id === this._id) {
                // don't raise error event if handler doesn't exist, node
                // will throw an exception
                if (this.emitter.eventNames().includes('error')) {
                    this.emitter.emit('error', arg.error || 'notification error');
                }
                this.destroy();
            }
        }
    }

    /**
     * close notification
     */
    close() {
        if (typeof this._closeNotification === 'function') {
            this._closeNotification('close');
        }
        this.destroy();
    }

    /**
     * always allow showing notifications.
     * @return {string} 'granted'
     */
    static get permission() {
        return 'granted';
    }

    /**
     * returns data object passed in via constructor options
     */
    get data() {
        return this._data;
    }

    /**
     * add event listeners for 'click', 'close', 'show', 'error' events
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
     * remove event listeners for 'click', 'close', 'show', 'error' events
     *
     * @param {String} event  event to stop listening for.
     * @param {func}   cb     callback associated with original addEventListener
     */
    removeEventListener(event, cb) {
        if (event && typeof cb === 'function') {
            this.emitter.removeListener(event, cb);
        }
    }

    //
    // private stuff below here
    //
    destroy() {
        this.emitter.removeAllListeners();
    }

}

module.exports = Notify;
