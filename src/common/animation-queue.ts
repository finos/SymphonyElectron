import { logger } from './logger';

export class AnimationQueue {
    private queue: any[] = [];
    private running: boolean = false;

    /**
     * Pushes each animation to a queue
     *
     * @param object
     */
    public push(object) {
        if (this.running) {
            this.queue.push(object);
        } else {
            this.running = true;
            setTimeout(this.animate.bind(this, object), 0);
        }
    }

    /**
     * Animates an animation that is part of the queue
     * @param object
     */
    public animate(object) {
        object.func.apply(null, object.args)
            .then(() => {
                if (this.queue.length > 0) {
                    // Run next animation
                    this.animate.call(this, this.queue.shift());
                } else {
                    this.running = false;
                }
            })
            .catch((err) => {
                logger.error(`animationQueue: encountered an error: ${err} with stack trace: ${err.stack}`);
            });
    }

    /**
     * Clears the queue
     */
    public clear() {
        this.queue = [];
    }
}
