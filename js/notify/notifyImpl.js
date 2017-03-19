'use strict';

/**
 * implementation for notifications
 */
class Notify {
    constructor(title, options) {
        const { notify } = require('./notify.js');
        this._id = notify({
            title: title,
            text: options.body,
            image: options.image,
            flash: options.flash,
            color: options.color,
            onShowFunc: onShow.bind(this)
        });

        function onShow(arg) {
            if (arg.id === this._id) {
                this._closeNotification = arg.closeNotification;
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

    }

    static get permission() {
        return 'granted';
    }

    addEventListener(event, cb) {
    }

    removeEventListener(event, cb) {
    }

    //
    // private stuff below here
    //
}

module.exports = Notify;
