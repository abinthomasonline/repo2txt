/**
 * Provider types and interfaces for repo2txt v2.0
 * Defines the contract that all data source providers must implement
 */

import type {
  ProviderType,
  ProviderCredentials,
  RepoMetadata,
  FileNode,
  FileContent,
  FetchOptions,
} from '@/types';

/**
 * Main provider interface that all providers must implement
 */
export interface IProvider {
  /**
   * Get the type of this provider
   */
  getType(): ProviderType;

  /**
   * Get a human-readable name for this provider
   */
  getName(): string;

  /**
   * Check if this provider requires authentication
   */
  requiresAuth(): boolean;

  /**
   * Set authentication credentials
   */
  setCredentials(credentials: ProviderCredentials): void;

  /**
   * Fetch the file tree from the repository
   * @param url - Repository URL or identifier
   * @param options - Additional fetch options
   * @returns Array of file nodes
   */
  fetchTree(url: string, options?: FetchOptions): Promise<FileNode[]>;

  /**
   * Fetch content of a single file
   * @param node - File node to fetch
   * @returns File content
   */
  fetchFile(node: FileNode): Promise<FileContent>;

  /**
   * Fetch multiple files with progress tracking
   * @param nodes - Array of file nodes to fetch
   * @returns Async generator yielding file contents
   */
  fetchMultiple(nodes: FileNode[]): AsyncGenerator<FileContent, void, unknown>;

  /**
   * Get metadata about the current repository
   */
  getRepoInfo(): RepoMetadata | null;

  /**
   * Validate a URL for this provider
   * @param url - URL to validate
   * @returns True if valid, false otherwise
   */
  validateUrl(url: string): boolean;

  /**
   * Parse a URL to extract repository information
   * @param url - URL to parse
   * @returns Parsed repository information
   */
  parseUrl(url: string): ParsedRepoInfo;

  /**
   * Reset the provider state
   */
  reset(): void;
}

/**
 * Parsed repository information from a URL
 */
export interface ParsedRepoInfo {
  owner?: string;
  repo?: string;
  branch?: string;
  path?: string;
  url: string;
  isValid: boolean;
  error?: string;
}

/**
 * Rate limiter configuration
 */
export interface RateLimiterConfig {
  maxConcurrent: number;
  delayMs?: number;
  retries?: number;
  retryDelayMs?: number;
}

/**
 * Provider error with user-friendly messages
 */
export class ProviderError extends Error {
  constructor(
    message: string,
    public code: string,
    public userMessage: string,
    public recovery?: () => void
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

/**
 * Common error codes
 */
export enum ErrorCode {
  INVALID_URL = 'INVALID_URL',
  AUTH_REQUIRED = 'AUTH_REQUIRED',
  AUTH_FAILED = 'AUTH_FAILED',
  NOT_FOUND = 'NOT_FOUND',
  RATE_LIMITED = 'RATE_LIMITED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  PARSE_ERROR = 'PARSE_ERROR',
  UNKNOWN = 'UNKNOWN',
}
