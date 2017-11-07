'use strict';

const log = require('../log.js');
const logLevels = require('../enums/logLevels.js');

/**
 * Manages one animation at a time
 * @param options
 * @constructor
 */
const AnimationQueue = function(options) {
    this.options = options;
    this.queue = [];
    this.running = false;
};

/**
 * Pushes each animation to a queue
 * @param object
 */
AnimationQueue.prototype.push = function(object) {
    if (this.running) {
        this.queue.push(object);
    } else {
        this.running = true;
        setTimeout(this.animate.bind(this, object), 0);
    }
};

/**
 * Animates an animation that is part of the queue
 * @param object
 */
AnimationQueue.prototype.animate = function(object) {
    object.func.apply(null, object.args)
    .then(function() {
        if (this.queue.length > 0) {
            // Run next animation
            this.animate.call(this, this.queue.shift());
        } else {
            this.running = false;
        }
    }.bind(this))
    .catch(function(err) {
        log.send(logLevels.ERROR, 'animationQueue: encountered an error: ' + err +
            ' with stack trace:' + err.stack);
        /* eslint-disable no-console */
        console.error('animation queue encountered an error: ' + err +
        ' with stack trace:' + err.stack);
        /* eslint-enable no-console */
    })
};

/**
 * Clears the queue
 */
AnimationQueue.prototype.clear = function() {
    this.queue = [];
};

module.exports = AnimationQueue;
