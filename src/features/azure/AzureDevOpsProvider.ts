/**
 * Azure DevOps provider implementation
 * Supports Azure DevOps Services (dev.azure.com) and Azure DevOps Server
 */

import { BaseProvider } from '@/lib/providers/BaseProvider';
import { ProviderError, ErrorCode } from '@/lib/providers/types';
import type { ParsedRepoInfo } from '@/lib/providers/types';
import type { ProviderType, FileNode, FileContent, FetchOptions } from '@/types';

interface AzureFileItem {
  objectId: string;
  gitObjectType: 'blob' | 'tree';
  path: string;
  url: string;
  isFolder?: boolean;
  size?: number;
}

export class AzureDevOpsProvider extends BaseProvider {
  private static readonly API_VERSION = '7.1';
  // Matches: https://dev.azure.com/{org}/{project}/_git/{repo}
  // Also: {org}.visualstudio.com/{project}/_git/{repo} (legacy)
  private static readonly URL_PATTERN =
    /^https:\/\/(?:dev\.azure\.com\/([^\/]+)\/([^\/]+)|([^\.]+)\.visualstudio\.com\/([^\/]+))\/_git\/([^\/\?]+)(?:\/?\?.*)?$/;

  getType(): ProviderType {
    return 'azure';
  }

  getName(): string {
    return 'Azure DevOps';
  }

  /**
   * Azure DevOps requires authentication for most operations
   */
  requiresAuth(): boolean {
    return true;
  }

  /**
   * Validate Azure DevOps URL format
   */
  validateUrl(url: string): boolean {
    const normalized = url.replace(/\/$/, '');
    return AzureDevOpsProvider.URL_PATTERN.test(normalized);
  }

  /**
   * Parse Azure DevOps URL to extract repository information
   */
  parseUrl(url: string): ParsedRepoInfo {
    const normalized = url.replace(/\/$/, '');
    const match = normalized.match(AzureDevOpsProvider.URL_PATTERN);

    if (!match) {
      return {
        url,
        isValid: false,
        error: 'Invalid Azure DevOps URL format. Expected: https://dev.azure.com/{org}/{project}/_git/{repo}',
      };
    }

    // Handle both modern (dev.azure.com) and legacy (visualstudio.com) formats
    const organization = match[1] || match[3];
    const project = match[2] || match[4];
    const repo = match[5];

    return {
      owner: `${organization}/${project}`, // Combined for display
      repo,
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
        parsed.error || 'Please provide a valid Azure DevOps repository URL'
      );
    }

    if (!this.credentials?.token) {
      throw new ProviderError(
        'Authentication required',
        ErrorCode.AUTH_REQUIRED,
        'Azure DevOps requires a Personal Access Token. Please add your PAT in the authentication section.'
      );
    }

    // Extract organization and project
    const match = url.match(AzureDevOpsProvider.URL_PATTERN);
    if (!match) {
      throw new ProviderError(
        'Failed to parse URL',
        ErrorCode.INVALID_URL,
        'Could not extract repository information from URL'
      );
    }

    const organization = match[1] || match[3];
    const project = match[2] || match[4];
    const repository = match[5];

    // Store repo metadata
    this.repoInfo = {
      type: 'azure',
      name: repository,
      owner: `${organization}/${project}`,
      branch: options?.branch,
      path: options?.path,
      url,
    };

    try {
      const apiBase = `https://dev.azure.com/${organization}/${project}/_apis/git/repositories/${repository}`;

      // Fetch items recursively
      const tree = await this.fetchTreeRecursive(apiBase, options?.branch);

      return tree;
    } catch (error) {
      throw this.handleFetchError(error, `${organization}/${project}/${repository}`);
    }
  }

  /**
   * Fetch complete file tree recursively using Items API
   */
  private async fetchTreeRecursive(
    apiBase: string,
    branch?: string
  ): Promise<FileNode[]> {
    const headers = this.buildAzureHeaders();

    // Use Items API with recursionLevel=Full to get entire tree
    const versionDescriptor = branch ? `&versionDescriptor.version=${encodeURIComponent(branch)}&versionDescriptor.versionType=branch` : '';
    const url = `${apiBase}/items?recursionLevel=Full&includeContentMetadata=true&api-version=${AzureDevOpsProvider.API_VERSION}${versionDescriptor}`;

    const response = await this.fetchWithRetry(url, { headers });
    const data = await response.json();

    // Filter out the root item and convert to FileNode format
    const items: AzureFileItem[] = data.value || [];

    return items
      .filter((item: AzureFileItem) => item.path !== '/') // Skip root
      .map((item: AzureFileItem) => ({
        path: item.path.startsWith('/') ? item.path.slice(1) : item.path,
        type: item.gitObjectType === 'blob' ? 'blob' : 'tree',
        url: item.url,
        urlType: 'api' as const,
        size: item.size,
        sha: item.objectId,
      }));
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
      const headers = this.buildAzureHeaders();

      // Add format parameter to get raw content
      const separator = node.url.includes('?') ? '&' : '?';
      const contentUrl = `${node.url}${separator}$format=text`;

      const response = await this.fetchWithRetry(contentUrl, { headers });
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
   * Build Azure DevOps-specific headers with authentication
   */
  private buildAzureHeaders(additionalHeaders?: Record<string, string>): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...additionalHeaders,
    };

    if (this.credentials?.token) {
      // Azure DevOps uses Basic Auth with empty username and PAT as password
      // Format: Authorization: Basic base64(:PAT)
      const auth = btoa(`:${this.credentials.token}`);
      headers['Authorization'] = `Basic ${auth}`;
    }

    return headers;
  }

  /**
   * Override error handling for Azure DevOps-specific errors
   */
  protected handleFetchError(error: unknown, context?: string): ProviderError {
    const contextMsg = context ? ` (${context})` : '';

    if (error instanceof ProviderError) {
      return error;
    }

    if (error instanceof Error) {
      const message = error.message;

      // 401 means invalid or expired PAT
      if (message.includes('401')) {
        return new ProviderError(
          message,
          ErrorCode.AUTH_FAILED,
          `Azure DevOps authentication failed${contextMsg}.

Your Personal Access Token may be invalid or expired. Please check your PAT and ensure it has 'Code (Read)' permissions.

Click the Azure DevOps icon to create or update your token.`,
          () => {
            window.open('https://dev.azure.com/_usersSettings/tokens', '_blank');
          }
        );
      }

      // 403 means insufficient permissions
      if (message.includes('403')) {
        return new ProviderError(
          message,
          ErrorCode.AUTH_FAILED,
          `Azure DevOps access denied${contextMsg}.

Your PAT may not have the required permissions. Please ensure your token has 'Code (Read)' scope.`,
          () => {
            window.open('https://dev.azure.com/_usersSettings/tokens', '_blank');
          }
        );
      }

      // 404 means repository not found or no access
      if (message.includes('404')) {
        return new ProviderError(
          message,
          ErrorCode.NOT_FOUND,
          `Azure DevOps repository not found${contextMsg}.

The repository may not exist, or you may not have access to it. Check the URL and your permissions.`
        );
      }
    }

    // Use base class error handling for other errors
    return super.handleFetchError(error, context);
  }
}
