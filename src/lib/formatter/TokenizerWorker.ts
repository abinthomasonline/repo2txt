/**
 * TokenizerWorker manager
 * Handles communication with the tokenizer Web Worker
 */

import type {
  TokenizeRequest,
  TokenizeResponse,
  ProgressResponse,
} from '@/workers/tokenizer.worker';

type MessageHandler = (response: TokenizeResponse | ProgressResponse) => void;

export class TokenizerWorker {
  private worker: Worker | null = null;
  private handlers = new Map<string, MessageHandler>();
  private requestId = 0;

  constructor() {
    this.initWorker();
  }

  private initWorker() {
    try {
      // Create worker
      this.worker = new Worker(
        new URL('@/workers/tokenizer.worker.ts', import.meta.url),
        { type: 'module' }
      );

      // Handle messages from worker
      this.worker.onmessage = (event: MessageEvent<TokenizeResponse | ProgressResponse>) => {
        const { id } = event.data;
        const handler = this.handlers.get(id);

        if (handler) {
          handler(event.data);

          // Remove handler if it's a final response (has tokenCount)
          if ('tokenCount' in event.data) {
            this.handlers.delete(id);
          }
        }
      };

      // Handle worker errors
      this.worker.onerror = (error) => {
        console.error('Tokenizer worker error:', error);
      };
    } catch (error) {
      console.warn('Failed to create tokenizer worker:', error);
      this.worker = null;
    }
  }

  /**
   * Tokenize single text
   */
  async tokenize(text: string): Promise<number> {
    if (!this.worker) {
      // Fallback to synchronous tokenization
      const { encode } = await import('gpt-tokenizer');
      return encode(text).length;
    }

    return new Promise((resolve, reject) => {
      const id = `single-${++this.requestId}`;

      this.handlers.set(id, (response) => {
        if ('error' in response && response.error) {
          reject(new Error(response.error));
        } else if ('tokenCount' in response) {
          resolve(response.tokenCount);
        }
      });

      const request: TokenizeRequest = {
        id,
        text,
        type: 'single',
      };

      this.worker!.postMessage(request);
    });
  }

  /**
   * Tokenize multiple files with progress callback
   */
  async tokenizeBatch(
    files: Array<{ path: string; content: string }>,
    onProgress?: (progress: number, current: number, total: number) => void
  ): Promise<{
    totalTokens: number;
    files: Array<{ path: string; tokenCount: number; lineCount: number }>;
  }> {
    if (!this.worker) {
      // Fallback to synchronous tokenization
      const { encode } = await import('gpt-tokenizer');
      const results = files.map((file) => ({
        path: file.path,
        tokenCount: encode(file.content).length,
        lineCount: file.content.split('\n').length,
      }));

      return {
        totalTokens: results.reduce((sum, r) => sum + r.tokenCount, 0),
        files: results,
      };
    }

    return new Promise((resolve, reject) => {
      const id = `batch-${++this.requestId}`;

      this.handlers.set(id, (response) => {
        if ('progress' in response) {
          // Progress update
          onProgress?.(response.progress, response.current, response.total);
        } else if ('error' in response && response.error) {
          reject(new Error(response.error));
        } else if ('tokenCount' in response && response.files) {
          // Final response
          resolve({
            totalTokens: response.tokenCount,
            files: response.files,
          });
        }
      });

      const request: TokenizeRequest = {
        id,
        text: '', // Not used for batch
        type: 'batch',
        files,
      };

      this.worker!.postMessage(request);
    });
  }

  /**
   * Terminate the worker
   */
  terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.handlers.clear();
  }
}

// Singleton instance
let tokenizerWorkerInstance: TokenizerWorker | null = null;

export function getTokenizerWorker(): TokenizerWorker {
  if (!tokenizerWorkerInstance) {
    tokenizerWorkerInstance = new TokenizerWorker();
  }
  return tokenizerWorkerInstance;
}

export function terminateTokenizerWorker() {
  if (tokenizerWorkerInstance) {
    tokenizerWorkerInstance.terminate();
    tokenizerWorkerInstance = null;
  }
}
