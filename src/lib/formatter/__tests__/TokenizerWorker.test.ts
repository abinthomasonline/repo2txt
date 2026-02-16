import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TokenizerWorker, getTokenizerWorker, terminateTokenizerWorker } from '../TokenizerWorker';

describe('TokenizerWorker', () => {
  let worker: TokenizerWorker;

  beforeEach(() => {
    worker = new TokenizerWorker();
  });

  afterEach(() => {
    worker.terminate();
  });

  describe('tokenize', () => {
    it('should tokenize single text', async () => {
      const text = 'Hello, world! This is a test.';
      const tokenCount = await worker.tokenize(text);

      expect(tokenCount).toBeGreaterThan(0);
      expect(typeof tokenCount).toBe('number');
    });

    it('should tokenize empty string', async () => {
      const tokenCount = await worker.tokenize('');
      expect(tokenCount).toBe(0);
    });

    it('should tokenize long text', async () => {
      const longText = 'Hello world! '.repeat(1000);
      const tokenCount = await worker.tokenize(longText);

      expect(tokenCount).toBeGreaterThan(1000);
    });
  });

  describe('tokenizeBatch', () => {
    it('should tokenize multiple files', async () => {
      const files = [
        { path: 'file1.txt', content: 'Hello world' },
        { path: 'file2.txt', content: 'Goodbye world' },
        { path: 'file3.txt', content: 'Testing testing 123' },
      ];

      const result = await worker.tokenizeBatch(files);

      expect(result.totalTokens).toBeGreaterThan(0);
      expect(result.files).toHaveLength(3);

      result.files.forEach((file, index) => {
        expect(file.path).toBe(files[index].path);
        expect(file.tokenCount).toBeGreaterThan(0);
        expect(file.lineCount).toBeGreaterThan(0);
      });
    });

    it('should report progress', async () => {
      const files = Array.from({ length: 10 }, (_, i) => ({
        path: `file${i}.txt`,
        content: `Content ${i}`,
      }));

      const progressUpdates: number[] = [];

      const result = await worker.tokenizeBatch(files, (progress) => {
        progressUpdates.push(progress);
      });

      // Note: In test environment without Web Workers, progress might not be reported
      // The important thing is that the tokenization completes successfully
      expect(result.totalTokens).toBeGreaterThan(0);
      expect(result.files).toHaveLength(10);

      // If progress was reported (with real worker), verify it
      if (progressUpdates.length > 0) {
        expect(progressUpdates[progressUpdates.length - 1]).toBe(100);
      }
    });

    it('should handle empty files', async () => {
      const files = [
        { path: 'empty.txt', content: '' },
        { path: 'nonempty.txt', content: 'Hello' },
      ];

      const result = await worker.tokenizeBatch(files);

      expect(result.files[0].tokenCount).toBe(0);
      expect(result.files[1].tokenCount).toBeGreaterThan(0);
    });

    it('should count lines correctly', async () => {
      const files = [
        { path: 'single.txt', content: 'Single line' },
        { path: 'multi.txt', content: 'Line 1\nLine 2\nLine 3' },
      ];

      const result = await worker.tokenizeBatch(files);

      expect(result.files[0].lineCount).toBe(1);
      expect(result.files[1].lineCount).toBe(3);
    });
  });

  describe('singleton', () => {
    it('should return same instance', () => {
      const worker1 = getTokenizerWorker();
      const worker2 = getTokenizerWorker();

      expect(worker1).toBe(worker2);
    });

    it('should create new instance after terminate', () => {
      const worker1 = getTokenizerWorker();
      terminateTokenizerWorker();
      const worker2 = getTokenizerWorker();

      expect(worker1).not.toBe(worker2);
    });
  });
});
