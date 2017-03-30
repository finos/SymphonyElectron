'use strict';

const EventEmitter = require('events');
const { notify } = require('./electron-notify.js');

/**
 * implementation for notifications interface,
 * wrapper around electron-notify.
 */
class Notify {
    constructor(title, options) {
        this.emitter = new EventEmitter();

        this._id = notify({
            title: title,
            text: options.body,
            image: options.image || options.icon,
            flash: options.flash,
            color: options.color,
            groupId: options.groupId,
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
                this.emitter.emit('click');
                arg.closeNotification();
            }
        }

        function onClose(arg) {
            if (arg.id === this._id || arg.event === 'close-all') {
                this.emitter.emit('close');
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

    close() {
        if (typeof this._closeNotification === 'function') {
            this._closeNotification('close');
        }
        this.destroy();
    }

    static get permission() {
        return 'granted';
    }

    get data() {
        return this._data;
    }

    addEventListener(event, cb) {
        if (event && typeof cb === 'function') {
            this.emitter.on(event, cb);
        }
    }

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
        // allow live instance to be destroyed
        this.emitter.emit('destroy');
    }

}

module.exports = Notify;
