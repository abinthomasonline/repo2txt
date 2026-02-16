/**
 * Rate limiter for controlling concurrent API requests
 */

export interface RateLimiterOptions {
  maxConcurrent?: number;
  minDelay?: number;
}

export class RateLimiter {
  private maxConcurrent: number;
  private minDelay: number;
  private queue: Array<() => void> = [];
  private activeCount = 0;
  private lastExecutionTime = 0;

  constructor(options: RateLimiterOptions = {}) {
    this.maxConcurrent = options.maxConcurrent || 10;
    this.minDelay = options.minDelay || 0;
  }

  /**
   * Execute a function with rate limiting
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Wait if we're at max concurrent requests
    if (this.activeCount >= this.maxConcurrent) {
      await new Promise<void>((resolve) => this.queue.push(resolve));
    }

    // Wait for minimum delay since last execution
    const now = Date.now();
    const timeSinceLastExecution = now - this.lastExecutionTime;
    if (timeSinceLastExecution < this.minDelay) {
      await this.delay(this.minDelay - timeSinceLastExecution);
    }

    this.activeCount++;
    this.lastExecutionTime = Date.now();

    try {
      return await fn();
    } finally {
      this.activeCount--;
      const resolve = this.queue.shift();
      if (resolve) {
        resolve();
      }
    }
  }

  /**
   * Execute multiple functions with rate limiting
   */
  async executeAll<T>(fns: Array<() => Promise<T>>): Promise<T[]> {
    return Promise.all(fns.map((fn) => this.execute(fn)));
  }

  /**
   * Execute multiple functions and yield results as they complete
   */
  async *executeStream<T>(fns: Array<() => Promise<T>>): AsyncGenerator<T, void, unknown> {
    const promises = fns.map((fn) => this.execute(fn));

    while (promises.length > 0) {
      const result = await Promise.race(promises);
      // Remove completed promise
      const index = promises.findIndex(async (p) => (await p) === result);
      if (index !== -1) {
        promises.splice(index, 1);
      }
      yield result;
    }
  }

  /**
   * Get current active request count
   */
  getActiveCount(): number {
    return this.activeCount;
  }

  /**
   * Get queue length
   */
  getQueueLength(): number {
    return this.queue.length;
  }

  /**
   * Clear the queue
   */
  clear(): void {
    this.queue = [];
    this.activeCount = 0;
  }

  /**
   * Utility: delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Create a default rate limiter instance
 */
export function createRateLimiter(options?: RateLimiterOptions): RateLimiter {
  return new RateLimiter(options);
}
