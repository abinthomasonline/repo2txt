/**
 * GitLab provider implementation
 * Supports GitLab.com and self-hosted instances
 */

import { BaseProvider } from '@/lib/providers/BaseProvider';
import { ProviderError, ErrorCode } from '@/lib/providers/types';
import type { ParsedRepoInfo } from '@/lib/providers/types';
import type { ProviderType, FileNode, FileContent, FetchOptions } from '@/types';

interface GitLabFileNode {
  id: string;
  name: string;
  type: 'tree' | 'blob';
  path: string;
  mode: string;
}

export class GitLabProvider extends BaseProvider {
  private static readonly DEFAULT_API_BASE = 'https://gitlab.com/api/v4';
  // More specific pattern that excludes github.com
  private static readonly URL_PATTERN =
    /^https:\/\/((?!github\.com)[^\/]+)\/([^\/]+(?:\/[^\/]+)*?)(?:\/-\/tree\/(.+))?$/;

  getType(): ProviderType {
    return 'gitlab';
  }

  getName(): string {
    return 'GitLab';
  }

  /**
   * GitLab requires auth for most operations on private repos
   * Public repos can be accessed without auth
   */
  requiresAuth(): boolean {
    return false;
  }

  /**
   * Validate GitLab URL format
   * Supports both gitlab.com and self-hosted instances
   */
  validateUrl(url: string): boolean {
    const normalized = url.replace(/\/$/, ''); // Remove trailing slash
    return GitLabProvider.URL_PATTERN.test(normalized);
  }

  /**
   * Parse GitLab URL to extract repository information
   * Format: https://gitlab.com/owner/repo or https://gitlab.com/group/subgroup/repo
   */
  parseUrl(url: string): ParsedRepoInfo {
    const normalized = url.replace(/\/$/, '');
    const match = normalized.match(GitLabProvider.URL_PATTERN);

    if (!match) {
      return {
        url,
        isValid: false,
        error: 'Invalid GitLab URL format. Expected: https://gitlab.com/owner/repo',
      };
    }

    const [, , projectPath, branchAndPath] = match;

    // Extract owner and repo from projectPath
    // For gitlab.com/owner/repo or gitlab.com/group/subgroup/repo
    const pathParts = projectPath.split('/');
    const repo = pathParts[pathParts.length - 1];
    const owner = pathParts.slice(0, -1).join('/');

    return {
      owner: owner || undefined,
      repo,
      branch: branchAndPath ? this.extractBranchFromPath(branchAndPath) : undefined,
      path: branchAndPath ? this.extractPathFromLastString(branchAndPath) : undefined,
      url,
      isValid: true,
    };
  }

  /**
   * Fetch repository file tree
   */
  async fetchTree(url: string, options?: FetchOptions): Promise<FileNode[]> {
    const parsed = this.parseUrl(url);

    if (!parsed.isValid) {
      throw new ProviderError(
        parsed.error || 'Invalid URL',
        ErrorCode.INVALID_URL,
        parsed.error || 'Please provide a valid GitLab repository URL'
      );
    }

    const { owner, repo } = parsed;
    if (!owner || !repo) {
      throw new ProviderError(
        'Missing owner or repo',
        ErrorCode.INVALID_URL,
        'Could not extract repository information from URL'
      );
    }

    // Get instance URL and API base
    const instanceMatch = url.match(/^https:\/\/([^\/]+)/);
    const instance = instanceMatch ? instanceMatch[1] : 'gitlab.com';
    const apiBase =
      instance === 'gitlab.com'
        ? GitLabProvider.DEFAULT_API_BASE
        : `https://${instance}/api/v4`;

    // URL-encode the project path for GitLab API
    const projectPath = `${owner}/${repo}`;
    const encodedProject = encodeURIComponent(projectPath);

    // Store repo metadata
    this.repoInfo = {
      type: 'gitlab',
      name: repo,
      owner,
      branch: options?.branch || parsed.branch,
      path: options?.path || parsed.path,
      url,
    };

    try {
      const ref = options?.branch || parsed.branch || 'main';
      const path = options?.path || parsed.path || '';

      // Fetch the tree recursively
      const tree = await this.fetchTreeRecursive(apiBase, encodedProject, ref, path);

      return tree;
    } catch (error) {
      throw this.handleFetchError(error, `${owner}/${repo}`);
    }
  }

  /**
   * Fetch complete file tree recursively from GitLab
   */
  private async fetchTreeRecursive(
    apiBase: string,
    encodedProject: string,
    ref: string,
    path: string,
    currentPath = ''
  ): Promise<FileNode[]> {
    const headers = this.buildGitLabHeaders();

    const pathParam = currentPath || path ? `&path=${encodeURIComponent(currentPath || path)}` : '';
    const url = `${apiBase}/projects/${encodedProject}/repository/tree?ref=${encodeURIComponent(ref)}${pathParam}&recursive=true&per_page=100`;

    const response = await this.fetchWithRetry(url, { headers });
    const data: GitLabFileNode[] = await response.json();

    return data.map((item) => ({
      path: item.path,
      type: item.type === 'blob' ? 'blob' : 'tree',
      url: this.buildFileUrl(apiBase, encodedProject, ref, item.path),
      urlType: 'api' as const,
    }));
  }

  /**
   * Build file content URL for GitLab API
   */
  private buildFileUrl(
    apiBase: string,
    encodedProject: string,
    ref: string,
    filePath: string
  ): string {
    const encodedPath = encodeURIComponent(filePath);
    return `${apiBase}/projects/${encodedProject}/repository/files/${encodedPath}/raw?ref=${encodeURIComponent(ref)}`;
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
      const headers = this.buildGitLabHeaders();
      const response = await this.fetchWithRetry(node.url, { headers });
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
   * Build GitLab-specific headers with authentication
   */
  private buildGitLabHeaders(additionalHeaders?: Record<string, string>): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...additionalHeaders,
    };

    if (this.credentials?.token) {
      headers['Private-Token'] = this.credentials.token;
    }

    return headers;
  }

  /**
   * Extract branch from branchAndPath (before first slash or entire string)
   */
  private extractBranchFromPath(branchAndPath: string): string {
    return branchAndPath.split('/')[0];
  }

  /**
   * Extract path from branchAndPath (everything after branch)
   */
  private extractPathFromLastString(branchAndPath: string): string {
    const parts = branchAndPath.split('/');
    return parts.slice(1).join('/');
  }

  /**
   * Override error handling for GitLab-specific errors
   */
  protected handleFetchError(error: unknown, context?: string): ProviderError {
    const contextMsg = context ? ` (${context})` : '';

    if (error instanceof ProviderError) {
      return error;
    }

    if (error instanceof Error) {
      const message = error.message;

      // 401 on GitLab means authentication required
      if (message.includes('401')) {
        return new ProviderError(
          message,
          ErrorCode.AUTH_REQUIRED,
          `GitLab authentication required${contextMsg}.

This repository may be private. Please add a GitLab Personal Access Token to access it.

Click the GitLab icon in the authentication section above to add a token.`,
          () => {
            window.open('https://gitlab.com/-/profile/personal_access_tokens', '_blank');
          }
        );
      }

      // 403 on GitLab usually means permission denied
      if (message.includes('403')) {
        return new ProviderError(
          message,
          ErrorCode.AUTH_FAILED,
          `GitLab access denied${contextMsg}.

Your token may not have the required permissions. Please ensure your token has 'read_api' and 'read_repository' scopes.`,
          () => {
            window.open('https://gitlab.com/-/profile/personal_access_tokens', '_blank');
          }
        );
      }

      // 429 is explicit rate limiting
      if (message.includes('429')) {
        return new ProviderError(
          message,
          ErrorCode.RATE_LIMITED,
          `GitLab API rate limit exceeded${contextMsg}. Please wait a moment and try again.`
        );
      }
    }

    // Use base class error handling for other errors
    return super.handleFetchError(error, context);
  }
}
