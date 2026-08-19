/**
 * GitHub provider implementation
 * Supports public and private repositories with personal access tokens
 */

import { BaseProvider } from '@/lib/providers/BaseProvider';
import { HttpError, ProviderError, ErrorCode } from '@/lib/providers/types';
import type { ParsedRepoInfo } from '@/lib/providers/types';
import type { ProviderType, FileNode, FetchOptions, FileContent } from '@/types';

interface GitHubReferences {
  branches: string[];
  tags: string[];
}

export class GitHubProvider extends BaseProvider {
  private static readonly API_BASE = 'https://api.github.com';
  private static readonly URL_PATTERN =
    /^https:\/\/github\.com\/([^/]+)\/([^/]+)(?:\/tree\/(.+))?$/;

  getType(): ProviderType {
    return 'github';
  }

  getName(): string {
    return 'GitHub';
  }

  /**
   * GitHub doesn't require auth for public repos
   */
  requiresAuth(): boolean {
    return false;
  }

  /**
   * Bring the shapes people paste into a single canonical form
   * Covers a missing or plain http scheme, www, ssh remotes and .git suffixes
   */
  static normalizeUrl(url: string): string {
    let normalized = url.trim().replace(/\/+$/, '');

    const sshMatch = normalized.match(/^git@github\.com:(.+)$/i);
    if (sshMatch) {
      normalized = `https://github.com/${sshMatch[1]}`;
    }

    normalized = /^https?:\/\//i.test(normalized)
      ? normalized.replace(/^https?:\/\//i, 'https://')
      : `https://${normalized.replace(/^\/+/, '')}`;

    return normalized
      .replace(/^https:\/\/www\./i, 'https://')
      .replace(/^(https:\/\/github\.com\/[^/]+\/[^/]+)\.git$/i, '$1');
  }

  /**
   * Validate GitHub URL format
   */
  validateUrl(url: string): boolean {
    return GitHubProvider.URL_PATTERN.test(GitHubProvider.normalizeUrl(url));
  }

  /**
   * Parse GitHub URL to extract repository information
   */
  parseUrl(url: string): ParsedRepoInfo {
    const normalized = GitHubProvider.normalizeUrl(url);
    const match = normalized.match(GitHubProvider.URL_PATTERN);

    if (!match) {
      return {
        url,
        isValid: false,
        error: 'Invalid GitHub URL format. Expected: github.com/owner/repo',
      };
    }

    const [, owner, repo, lastString] = match;

    return {
      owner,
      repo,
      // Store the full lastString - will be resolved later with actual branch list
      // This supports branch names with slashes like "feature/test/branch-name"
      branch: lastString,
      path: undefined, // Will be resolved in resolveRefAndPath
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
        parsed.error || 'Please provide a valid GitHub repository URL'
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

    // Store repo metadata
    this.repoInfo = {
      type: 'github',
      name: repo,
      owner,
      branch: options?.branch || parsed.branch,
      path: options?.path || parsed.path,
      url,
    };

    try {
      // Resolve branch/path if URL contains tree segment
      let ref = options?.branch || parsed.branch || '';
      let path = options?.path || parsed.path || '';

      if (parsed.branch) {
        const references = await this.fetchReferences(owner, repo);
        const resolved = this.resolveRefAndPath(parsed.branch, references);
        ref = resolved.ref;
        path = resolved.path;
      }

      // Fetch the tree SHA
      const sha = await this.fetchTreeSha(owner, repo, ref, path);

      // Fetch the complete tree
      const tree = await this.fetchTreeRecursive(owner, repo, sha);

      return tree;
    } catch (error) {
      throw this.handleFetchError(error, `${owner}/${repo}`);
    }
  }

  /**
   * Fetch references (branches and tags)
   */
  private async fetchReferences(owner: string, repo: string): Promise<GitHubReferences> {
    const headers = this.buildGitHubHeaders();

    const [branchesResponse, tagsResponse] = await Promise.all([
      this.fetchWithRetry(
        `${GitHubProvider.API_BASE}/repos/${owner}/${repo}/git/matching-refs/heads/`,
        { headers }
      ),
      this.fetchWithRetry(
        `${GitHubProvider.API_BASE}/repos/${owner}/${repo}/git/matching-refs/tags/`,
        { headers }
      ),
    ]);

    const branchesData = await branchesResponse.json();
    const tagsData = await tagsResponse.json();

    return {
      branches: branchesData.map((b: { ref: string }) => b.ref.split('/').slice(2).join('/')),
      tags: tagsData.map((t: { ref: string }) => t.ref.split('/').slice(2).join('/')),
    };
  }

  /**
   * Resolve ref and path from URL segment
   * Handles branch names with slashes like "feature/test/branch-name"
   */
  private resolveRefAndPath(
    lastString: string,
    references: GitHubReferences
  ): { ref: string; path: string } {
    const allRefs = [...references.branches, ...references.tags];

    // Sort refs by length (longest first) to match the most specific branch first
    // This handles cases like "feature/test/branch" vs "feature/test" vs "feature"
    const sortedRefs = allRefs.sort((a, b) => b.length - a.length);

    // Find the longest matching ref that is either:
    // 1. The entire lastString (exact branch name)
    // 2. Followed by a "/" (branch + path)
    const matchingRef = sortedRefs.find((ref) => {
      if (lastString === ref) {
        return true; // Exact match
      }
      if (lastString.startsWith(ref + '/')) {
        return true; // Branch followed by path
      }
      return false;
    });

    if (matchingRef) {
      const remainingPath = lastString.slice(matchingRef.length);
      return {
        ref: matchingRef,
        path: remainingPath.startsWith('/') ? remainingPath.slice(1) : remainingPath,
      };
    }

    // If no match found, treat entire string as ref
    // This will be validated when fetching the tree
    return { ref: lastString, path: '' };
  }

  /**
   * Fetch tree SHA for a specific ref/path
   */
  private async fetchTreeSha(
    owner: string,
    repo: string,
    ref: string,
    path: string
  ): Promise<string> {
    const headers = this.buildGitHubHeaders({
      Accept: 'application/vnd.github.object+json',
    });

    const pathSegment = path ? `/${path}` : '';
    const refParam = ref ? `?ref=${encodeURIComponent(ref)}` : '';
    const url = `${GitHubProvider.API_BASE}/repos/${owner}/${repo}/contents${pathSegment}${refParam}`;

    const response = await this.fetchWithRetry(url, { headers });
    const data = await response.json();

    return data.sha;
  }

  /**
   * Fetch complete file tree recursively
   */
  private async fetchTreeRecursive(owner: string, repo: string, sha: string): Promise<FileNode[]> {
    const headers = this.buildGitHubHeaders({
      Accept: 'application/vnd.github+json',
    });

    const url = `${GitHubProvider.API_BASE}/repos/${owner}/${repo}/git/trees/${sha}?recursive=1`;
    const response = await this.fetchWithRetry(url, { headers });
    const data = await response.json();

    return data.tree.map(
      (item: { path: string; type: string; url: string; size?: number; sha?: string }) => ({
        path: item.path,
        type: item.type === 'blob' ? 'blob' : 'tree',
        url: item.url,
        urlType: 'api' as const,
        size: item.size,
        sha: item.sha,
      })
    );
  }

  /**
   * Fetch a single file's content (override to handle GitHub's base64 encoding)
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
      const headers = this.buildGitHubHeaders();
      const response = await this.fetchWithRetry(node.url, { headers });
      const data = await response.json();

      // GitHub returns base64-encoded content
      let text = data.content || '';
      if (data.encoding === 'base64') {
        // Remove whitespace/newlines from base64 string
        text = text.replace(/\s/g, '');
        // Decode base64 to binary string, then convert to UTF-8
        const binaryString = atob(text);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        text = new TextDecoder('utf-8').decode(bytes);
      }

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
   * Build GitHub-specific headers with authentication
   */
  private buildGitHubHeaders(additionalHeaders?: Record<string, string>): HeadersInit {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      ...additionalHeaders,
    };

    if (this.credentials?.token) {
      headers['Authorization'] = `token ${this.credentials.token}`;
    }

    return headers;
  }

  /**
   * Override error handling for GitHub-specific errors
   */
  protected handleFetchError(error: unknown, context?: string): ProviderError {
    const contextMsg = context ? ` (${context})` : '';

    if (error instanceof ProviderError) {
      return error;
    }

    if (error instanceof HttpError && (error.status === 403 || error.status === 429)) {
      const isQuotaExhausted =
        error.status === 429 ||
        error.rateLimitRemaining === 0 ||
        error.retryAfterSeconds !== undefined ||
        /rate limit/i.test(error.apiMessage || '');

      // A private repository refusing an anonymous reader also answers 403
      if (!isQuotaExhausted) {
        return new ProviderError(
          error.message,
          ErrorCode.AUTH_FAILED,
          `GitHub denied access${contextMsg}.${
            error.apiMessage ? `\n\n${error.apiMessage}` : ''
          }\n\nPrivate repositories need a Personal Access Token with repo scope.`,
          this.openTokenPage
        );
      }

      const hasToken = Boolean(this.credentials?.token);
      const quota = hasToken ? '5,000' : '60';
      const resetsIn = error.rateLimitReset ? this.describeReset(error.rateLimitReset) : null;

      return new ProviderError(
        error.message,
        ErrorCode.RATE_LIMITED,
        `GitHub API rate limit reached${contextMsg}.

Every file is fetched as its own API request, so a large repository can use the ${quota} requests per hour that ${
          hasToken ? 'a token allows' : 'anonymous access allows'
        }.${resetsIn ? ` The limit resets ${resetsIn}.` : ''}

${
  hasToken
    ? 'Select fewer files, or wait for the limit to reset.'
    : 'Add a Personal Access Token to raise the limit to 5,000 requests per hour, or select fewer files.'
}`,
        hasToken ? undefined : this.openTokenPage
      );
    }

    // Use base class error handling for other errors
    return super.handleFetchError(error, context);
  }

  /**
   * Describe when a rate limit window reopens in terms a reader can act on
   */
  private describeReset(reset: Date): string {
    const minutes = Math.max(1, Math.ceil((reset.getTime() - Date.now()) / 60000));
    return minutes > 60
      ? `at ${reset.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
      : `in ${minutes} minute${minutes === 1 ? '' : 's'}`;
  }

  private openTokenPage = () => {
    window.open('https://github.com/settings/tokens/new?description=repo2txt&scopes=repo', '_blank');
  };
}
