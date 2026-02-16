/**
 * Base provider class with common functionality
 * All providers should extend this class
 */

import type {
  ProviderType,
  ProviderCredentials,
  RepoMetadata,
  FileNode,
  FileContent,
  FetchOptions,
} from '@/types';
import type { IProvider, ParsedRepoInfo, RateLimiterConfig } from './types';
import { ProviderError, ErrorCode } from './types';

export abstract class BaseProvider implements IProvider {
  protected credentials: ProviderCredentials | null = null;
  protected repoInfo: RepoMetadata | null = null;
  protected rateLimiter: RateLimiterConfig = {
    maxConcurrent: 10,
    delayMs: 100,
    retries: 3,
    retryDelayMs: 1000,
  };

  // Abstract methods that must be implemented by subclasses
  abstract getType(): ProviderType;
  abstract getName(): string;
  abstract fetchTree(url: string, options?: FetchOptions): Promise<FileNode[]>;
  abstract validateUrl(url: string): boolean;
  abstract parseUrl(url: string): ParsedRepoInfo;

  /**
   * Most providers require auth, but can be overridden
   */
  requiresAuth(): boolean {
    return true;
  }

  /**
   * Set authentication credentials
   */
  setCredentials(credentials: ProviderCredentials): void {
    this.credentials = credentials;
  }

  /**
   * Get current credentials
   */
  protected getCredentials(): ProviderCredentials | null {
    return this.credentials;
  }

  /**
   * Fetch a single file's content
   */
  async fetchFile(node: FileNode): Promise<FileContent> {
    if (!node.url) {
      throw new ProviderError(
        'File node has no URL',
        ErrorCode.INVALID_URL,
        'Cannot fetch file: missing URL'
      );
    }

    try {
      const response = await this.fetchWithRetry(node.url);
      const text = await response.text();

      return {
        path: node.path,
        text,
        url: node.url,
        lineCount: text.split('\n').length,
      };
    } catch (error) {
      throw this.handleFetchError(error, node.path);
    }
  }

  /**
   * Fetch multiple files with concurrency control
   */
  async *fetchMultiple(nodes: FileNode[]): AsyncGenerator<FileContent, void, unknown> {
    const queue = [...nodes];
    const inProgress = new Set<Promise<FileContent>>();

    while (queue.length > 0 || inProgress.size > 0) {
      // Start new fetches up to max concurrent
      while (queue.length > 0 && inProgress.size < this.rateLimiter.maxConcurrent) {
        const node = queue.shift()!;
        const promise = this.fetchFile(node);
        inProgress.add(promise);

        // Remove from in-progress when done
        promise.finally(() => inProgress.delete(promise));
      }

      // Wait for at least one to complete
      if (inProgress.size > 0) {
        const content = await Promise.race(inProgress);
        yield content;
      }
    }
  }

  /**
   * Get repository metadata
   */
  getRepoInfo(): RepoMetadata | null {
    return this.repoInfo;
  }

  /**
   * Reset provider state
   */
  reset(): void {
    this.credentials = null;
    this.repoInfo = null;
  }

  /**
   * Fetch with automatic retry logic
   */
  protected async fetchWithRetry(
    url: string,
    options?: RequestInit,
    attempt = 1
  ): Promise<Response> {
    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;
    } catch (error) {
      if (attempt < (this.rateLimiter.retries || 3)) {
        await this.delay(this.rateLimiter.retryDelayMs || 1000);
        return this.fetchWithRetry(url, options, attempt + 1);
      }
      throw error;
    }
  }

  /**
   * Handle fetch errors with user-friendly messages
   */
  protected handleFetchError(error: unknown, context?: string): ProviderError {
    const contextMsg = context ? ` (${context})` : '';

    if (error instanceof ProviderError) {
      return error;
    }

    if (error instanceof Error) {
      if (error.message.includes('404')) {
        return new ProviderError(
          error.message,
          ErrorCode.NOT_FOUND,
          `Resource not found${contextMsg}. Please check the URL and try again.`
        );
      }

      if (error.message.includes('403')) {
        return new ProviderError(
          error.message,
          ErrorCode.AUTH_FAILED,
          `Access denied${contextMsg}. Please check your credentials or token.`
        );
      }

      if (error.message.includes('429')) {
        return new ProviderError(
          error.message,
          ErrorCode.RATE_LIMITED,
          `Rate limit exceeded${contextMsg}. Please wait a moment and try again.`
        );
      }

      if (error.message.includes('network') || error.message.includes('fetch')) {
        return new ProviderError(
          error.message,
          ErrorCode.NETWORK_ERROR,
          `Network error${contextMsg}. Please check your connection and try again.`
        );
      }
    }

    return new ProviderError(
      String(error),
      ErrorCode.UNKNOWN,
      `An unexpected error occurred${contextMsg}. Please try again.`
    );
  }

  /**
   * Utility: delay execution
   */
  protected delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Utility: build headers with authentication
   */
  protected buildHeaders(additionalHeaders?: Record<string, string>): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...additionalHeaders,
    };

    if (this.credentials?.token) {
      // Different providers use different auth headers
      // Subclasses can override this
      headers['Authorization'] = `Bearer ${this.credentials.token}`;
    }

    return headers;
  }
}
