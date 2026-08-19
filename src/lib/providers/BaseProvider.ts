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
import { HttpError, ProviderError, ErrorCode } from './types';

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
    const inProgress = new Map<Promise<{ content: FileContent; promise: Promise<FileContent> }>, Promise<FileContent>>();

    while (queue.length > 0 || inProgress.size > 0) {
      // Start new fetches up to max concurrent
      while (queue.length > 0 && inProgress.size < this.rateLimiter.maxConcurrent) {
        const node = queue.shift()!;
        const promise = this.fetchFile(node);
        // Wrap promise to include itself for tracking
        const wrappedPromise = promise.then(content => ({ content, promise }));
        inProgress.set(wrappedPromise, promise);
      }

      // Wait for at least one to complete
      if (inProgress.size > 0) {
        const { content, promise } = await Promise.race(Array.from(inProgress.keys()));
        // Remove the completed promise
        for (const [wrapped, orig] of inProgress) {
          if (orig === promise) {
            inProgress.delete(wrapped);
            break;
          }
        }
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
    const maxAttempts = this.rateLimiter.retries || 3;
    let response: Response;

    try {
      response = await fetch(url, options);
    } catch (error) {
      // Connection level failures are worth another attempt
      if (attempt < maxAttempts) {
        await this.delay((this.rateLimiter.retryDelayMs || 1000) * attempt);
        return this.fetchWithRetry(url, options, attempt + 1);
      }
      throw error;
    }

    if (response.ok) {
      return response;
    }

    const httpError = await this.buildHttpError(response);

    // Retrying a rejected request only spends more of the quota that rejected it
    if (this.isRetryable(httpError) && attempt < maxAttempts) {
      const waitMs = httpError.retryAfterSeconds
        ? httpError.retryAfterSeconds * 1000
        : (this.rateLimiter.retryDelayMs || 1000) * attempt;
      await this.delay(waitMs);
      return this.fetchWithRetry(url, options, attempt + 1);
    }

    throw httpError;
  }

  /**
   * Turn a failed response into an error that carries the status and whatever the API said
   */
  protected async buildHttpError(response: Response): Promise<HttpError> {
    let apiMessage: string | undefined;

    try {
      const body = await response.text();
      if (body) {
        const data = JSON.parse(body);
        if (typeof data?.message === 'string') {
          apiMessage = data.message;
        }
      }
    } catch {
      // A body that is missing or is not JSON tells us nothing extra
    }

    const retryAfter = Number(response.headers.get('retry-after'));
    const reset = Number(response.headers.get('x-ratelimit-reset'));
    const remainingHeader = response.headers.get('x-ratelimit-remaining');
    const remaining = remainingHeader === null ? NaN : Number(remainingHeader);

    return new HttpError(
      response.status,
      apiMessage || response.statusText || undefined,
      Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined,
      Number.isFinite(reset) && reset > 0 ? new Date(reset * 1000) : undefined,
      Number.isFinite(remaining) ? remaining : undefined
    );
  }

  /**
   * Server faults and short throttles are transient, client errors are not
   */
  protected isRetryable(error: HttpError): boolean {
    // A wait the server asks for decides the matter, however the request failed
    if (error.retryAfterSeconds !== undefined) return error.retryAfterSeconds <= 10;
    return error.status >= 500 || error.status === 429;
  }

  /**
   * Handle fetch errors with user-friendly messages
   */
  protected handleFetchError(error: unknown, context?: string): ProviderError {
    const contextMsg = context ? ` (${context})` : '';

    if (error instanceof ProviderError) {
      return error;
    }

    if (error instanceof HttpError) {
      const detail = error.apiMessage ? `\n\n${error.apiMessage}` : '';

      if (error.status === 401) {
        return new ProviderError(
          error.message,
          ErrorCode.AUTH_FAILED,
          `Authentication failed${contextMsg}. The access token is missing, expired, or lacks permission for this repository.${detail}`
        );
      }

      if (error.status === 404) {
        return new ProviderError(
          error.message,
          ErrorCode.NOT_FOUND,
          `Resource not found${contextMsg}. Please check the URL and try again.${detail}`
        );
      }

      if (error.status === 403) {
        return new ProviderError(
          error.message,
          ErrorCode.AUTH_FAILED,
          `Access denied${contextMsg}. Please check your credentials or token.${detail}`
        );
      }

      if (error.status === 429) {
        return new ProviderError(
          error.message,
          ErrorCode.RATE_LIMITED,
          `Rate limit exceeded${contextMsg}. Please wait a moment and try again.${detail}`
        );
      }

      if (error.status >= 500) {
        return new ProviderError(
          error.message,
          ErrorCode.NETWORK_ERROR,
          `The service returned an error (HTTP ${error.status})${contextMsg}. Please try again in a moment.${detail}`
        );
      }

      return new ProviderError(
        error.message,
        ErrorCode.UNKNOWN,
        `The request failed with HTTP ${error.status}${contextMsg}.${detail}`
      );
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
