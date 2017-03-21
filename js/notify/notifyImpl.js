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
            image: options.image,
            flash: options.flash,
            color: options.color,
            onShowFunc: onShow.bind(this),
            onClickFunc: onClick.bind(this),
            onCloseFunc: onClose.bind(this)
        });

        function onShow(arg) {
            if (arg.id === this._id) {
                this.emitter.emit('show');
                this._closeNotification = arg.closeNotification;
            }
        }

        function onClick(arg) {
            if (arg.id === this._id) {
                this.emitter.emit('click');
            }
        }

        function onClose(arg) {
            if (arg.id === this._id || arg.event === 'close-all') {
                this.emitter.emit('close');
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

    destroy() {
        this.emitter.removeAllListeners();
    }

    static get permission() {
        return 'granted';
    }

    addEventListener(event, cb) {
        if (event && typeof cb === 'function') {
            this.emitter.on(event, cb);
        }
    }

    removeEventListener(event, cb) {
        if (event && typeof cb === 'function') {
            this.emitter.removeEventListener(event, cb);
        }
    }

    //
    // private stuff below here
    //
}

module.exports = Notify;
