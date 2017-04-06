'use strict';

// One animation at a time
const AnimationQueue = function(options) {
    this.options = options;
    this.queue = [];
    this.running = false;
}

AnimationQueue.prototype.push = function(object) {
    if (this.running) {
        this.queue.push(object);
    } else {
        this.running = true;
        setTimeout(this.animate.bind(this, object), 0);
    }
}

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
        /* eslint-disable no-console */
        console.error('animation queue encountered an error: ' + err +
        ' with stack trace:' + err.stack);
        /* eslint-enable no-console */
    })
}

AnimationQueue.prototype.clear = function() {
    this.queue = [];
}

module.exports = AnimationQueue;
