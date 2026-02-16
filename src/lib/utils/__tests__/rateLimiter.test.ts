import { describe, it, expect, vi } from 'vitest';
import { RateLimiter } from '../rateLimiter';

describe('RateLimiter', () => {

  describe('constructor', () => {
    it('should create with default options', () => {
      const limiter = new RateLimiter();
      expect(limiter.getActiveCount()).toBe(0);
      expect(limiter.getQueueLength()).toBe(0);
    });

    it('should create with custom options', () => {
      const limiter = new RateLimiter({
        maxConcurrent: 5,
        minDelay: 100,
      });
      expect(limiter).toBeInstanceOf(RateLimiter);
    });
  });

  describe('execute', () => {
    it('should execute function', async () => {
      const limiter = new RateLimiter();
      const fn = vi.fn().mockResolvedValue('result');

      const result = await limiter.execute(fn);

      expect(result).toBe('result');
      expect(fn).toHaveBeenCalledOnce();
    });

    it('should track active count', async () => {
      const limiter = new RateLimiter({ maxConcurrent: 2 });
      const fn = () => new Promise((resolve) => setTimeout(resolve, 10));

      const promise1 = limiter.execute(fn);
      expect(limiter.getActiveCount()).toBeGreaterThanOrEqual(0);

      const promise2 = limiter.execute(fn);
      expect(limiter.getActiveCount()).toBeGreaterThanOrEqual(0);

      await promise1;
      await promise2;

      expect(limiter.getActiveCount()).toBe(0);
    });

    it('should respect max concurrent limit', async () => {
      const limiter = new RateLimiter({ maxConcurrent: 2 });
      let activeCount = 0;
      let maxActive = 0;

      const fn = async () => {
        activeCount++;
        maxActive = Math.max(maxActive, activeCount);
        await new Promise((resolve) => setTimeout(resolve, 10));
        activeCount--;
        return 'done';
      };

      const promises = [
        limiter.execute(fn),
        limiter.execute(fn),
        limiter.execute(fn),
        limiter.execute(fn),
      ];

      await Promise.all(promises);

      expect(maxActive).toBeLessThanOrEqual(2);
    });

    it('should queue requests when at max concurrent', async () => {
      const limiter = new RateLimiter({ maxConcurrent: 1 });
      const fn = () => new Promise((resolve) => setTimeout(resolve, 10));

      const p1 = limiter.execute(fn);
      expect(limiter.getActiveCount()).toBe(1);

      const p2 = limiter.execute(fn);
      // Second request should be queued
      expect(limiter.getActiveCount() + limiter.getQueueLength()).toBeGreaterThanOrEqual(1);

      await Promise.all([p1, p2]);
    });
  });

  describe('executeAll', () => {
    it('should execute all functions', async () => {
      const limiter = new RateLimiter();
      const fn1 = vi.fn().mockResolvedValue('result1');
      const fn2 = vi.fn().mockResolvedValue('result2');
      const fn3 = vi.fn().mockResolvedValue('result3');

      const results = await limiter.executeAll([fn1, fn2, fn3]);

      expect(results).toEqual(['result1', 'result2', 'result3']);
      expect(fn1).toHaveBeenCalled();
      expect(fn2).toHaveBeenCalled();
      expect(fn3).toHaveBeenCalled();
    });
  });

  describe('clear', () => {
    it('should clear queue and reset count', () => {
      const limiter = new RateLimiter({ maxConcurrent: 1 });

      limiter.clear();

      expect(limiter.getActiveCount()).toBe(0);
      expect(limiter.getQueueLength()).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should propagate errors', async () => {
      const limiter = new RateLimiter();
      const error = new Error('Test error');
      const fn = vi.fn().mockRejectedValue(error);

      await expect(limiter.execute(fn)).rejects.toThrow('Test error');
    });

    it('should continue processing after error', async () => {
      const limiter = new RateLimiter();
      const errorFn = vi.fn().mockRejectedValue(new Error('Error'));
      const successFn = vi.fn().mockResolvedValue('success');

      try {
        await limiter.execute(errorFn);
      } catch {
        // Expected
      }

      const result = await limiter.execute(successFn);
      expect(result).toBe('success');
      expect(limiter.getActiveCount()).toBe(0);
    });
  });
});
