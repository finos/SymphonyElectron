import { logger } from './logger';

export class AnimationQueue {
  private queue: any[] = [];
  private running: boolean = false;

  constructor() {
    this.animate = this.animate.bind(this);
  }

  /**
   * Pushes each animation to a queue
   *
   * @param object
   */
  public push(object): void {
    if (this.running) {
      this.queue.push(object);
      return;
    }
    this.running = true;
    setTimeout(() => this.animate(object), 0);
  }

  /**
   * Animates an animation that is part of the queue
   * @param object
   */
  public async animate(object): Promise<void> {
    try {
      await object.func.apply(null, object.args);
    } catch (err: any) {
      logger.error(
        `animation-queue: encountered an error: ${err} with stack trace: ${err.stack}`,
      );
    } finally {
      if (this.queue.length > 0) {
        // Run next animation
        this.animate.call(this, this.queue.shift());
      } else {
        this.running = false;
      }
    }
  }

  /**
   * Clears the queue
   */
  public clear(): void {
    this.queue = [];
  }
}
