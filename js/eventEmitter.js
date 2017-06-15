'use strict';

const EventEmitter = require('events').EventEmitter;
const eventEmitter = new EventEmitter();

// These method should only be used in main process
module.exports = {
    emit: eventEmitter.emit,
    on: eventEmitter.on
};