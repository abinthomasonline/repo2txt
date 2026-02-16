/**
 * Web Worker for tokenization
 * Offloads expensive token counting to a background thread
 */

import { encode } from 'gpt-tokenizer';

export interface TokenizeRequest {
  id: string;
  text: string;
  type: 'single' | 'batch';
  files?: Array<{ path: string; content: string }>;
}

export interface TokenizeResponse {
  id: string;
  tokenCount: number;
  files?: Array<{ path: string; tokenCount: number; lineCount: number }>;
  error?: string;
}

export interface ProgressResponse {
  id: string;
  progress: number;
  current: number;
  total: number;
}

// Handle messages from main thread
self.onmessage = (event: MessageEvent<TokenizeRequest>) => {
  const { id, text, type, files } = event.data;

  try {
    if (type === 'single') {
      // Single text tokenization
      const tokenCount = encode(text).length;

      const response: TokenizeResponse = {
        id,
        tokenCount,
      };

      self.postMessage(response);
    } else if (type === 'batch' && files) {
      // Batch file tokenization with progress
      const total = files.length;
      const results: Array<{ path: string; tokenCount: number; lineCount: number }> = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Tokenize content
        const tokenCount = encode(file.content).length;
        const lineCount = file.content.split('\n').length;

        results.push({
          path: file.path,
          tokenCount,
          lineCount,
        });

        // Send progress update
        const progress: ProgressResponse = {
          id,
          progress: ((i + 1) / total) * 100,
          current: i + 1,
          total,
        };
        self.postMessage(progress);
      }

      // Calculate total tokens
      const totalTokens = results.reduce((sum, r) => sum + r.tokenCount, 0);

      // Send final response
      const response: TokenizeResponse = {
        id,
        tokenCount: totalTokens,
        files: results,
      };

      self.postMessage(response);
    }
  } catch (error) {
    // Send error response
    const errorResponse: TokenizeResponse = {
      id,
      tokenCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };

    self.postMessage(errorResponse);
  }
};
