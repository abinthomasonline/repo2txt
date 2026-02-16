import { describe, it, expect, beforeEach, vi, beforeAll, afterAll, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { GitHubProvider } from '../GitHubProvider';
import { ErrorCode } from '@/lib/providers/types';
import type { FileNode } from '@/types';

// Mock GitHub API responses
const mockBranchesResponse = [
  { ref: 'refs/heads/main' },
  { ref: 'refs/heads/develop' },
  { ref: 'refs/heads/feature/test-branch' },
];

const mockTagsResponse = [
  { ref: 'refs/tags/v1.0.0' },
  { ref: 'refs/tags/v2.0.0' },
];

const mockTreeResponse = {
  sha: 'tree-sha-123',
  tree: [
    { path: 'README.md', type: 'blob', url: 'https://api.github.com/repos/owner/repo/git/blobs/1', size: 100, sha: 'sha1' },
    { path: 'src', type: 'tree', url: 'https://api.github.com/repos/owner/repo/git/trees/2', sha: 'sha2' },
    { path: 'src/index.ts', type: 'blob', url: 'https://api.github.com/repos/owner/repo/git/blobs/3', size: 200, sha: 'sha3' },
  ],
};

const mockContentResponse = {
  sha: 'content-sha-123',
  type: 'dir',
};

const mockFileContent = {
  content: Buffer.from('console.log("Hello");').toString('base64'),
  encoding: 'base64',
};

// Setup MSW server
const server = setupServer(
  // Branches endpoint
  http.get('https://api.github.com/repos/:owner/:repo/git/matching-refs/heads/', () => {
    return HttpResponse.json(mockBranchesResponse);
  }),

  // Tags endpoint
  http.get('https://api.github.com/repos/:owner/:repo/git/matching-refs/tags/', () => {
    return HttpResponse.json(mockTagsResponse);
  }),

  // Contents endpoint (returns SHA)
  http.get('https://api.github.com/repos/:owner/:repo/contents', () => {
    return HttpResponse.json(mockContentResponse);
  }),

  http.get('https://api.github.com/repos/:owner/:repo/contents/*', () => {
    return HttpResponse.json(mockContentResponse);
  }),

  // Tree endpoint (recursive)
  http.get('https://api.github.com/repos/:owner/:repo/git/trees/:sha', () => {
    return HttpResponse.json(mockTreeResponse);
  }),

  // Blob endpoint (file content)
  http.get('https://api.github.com/repos/:owner/:repo/git/blobs/:sha', () => {
    return HttpResponse.json(mockFileContent);
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('GitHubProvider', () => {
  let provider: GitHubProvider;

  beforeEach(() => {
    provider = new GitHubProvider();
  });

  describe('getType and getName', () => {
    it('should return correct type', () => {
      expect(provider.getType()).toBe('github');
    });

    it('should return correct name', () => {
      expect(provider.getName()).toBe('GitHub');
    });
  });

  describe('validateUrl', () => {
    it('should validate basic repo URL', () => {
      expect(provider.validateUrl('https://github.com/owner/repo')).toBe(true);
    });

    it('should validate repo URL with branch', () => {
      expect(provider.validateUrl('https://github.com/owner/repo/tree/main')).toBe(true);
    });

    it('should validate repo URL with branch and path', () => {
      expect(provider.validateUrl('https://github.com/owner/repo/tree/main/src/components')).toBe(true);
    });

    it('should handle trailing slash', () => {
      expect(provider.validateUrl('https://github.com/owner/repo/')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(provider.validateUrl('https://github.com/owner')).toBe(false);
      expect(provider.validateUrl('https://gitlab.com/owner/repo')).toBe(false);
      expect(provider.validateUrl('not-a-url')).toBe(false);
      expect(provider.validateUrl('')).toBe(false);
    });
  });

  describe('parseUrl', () => {
    it('should parse basic repo URL', () => {
      const result = provider.parseUrl('https://github.com/facebook/react');

      expect(result.isValid).toBe(true);
      expect(result.owner).toBe('facebook');
      expect(result.repo).toBe('react');
      expect(result.branch).toBeUndefined();
      expect(result.path).toBeUndefined();
    });

    it('should parse URL with branch', () => {
      const result = provider.parseUrl('https://github.com/facebook/react/tree/main');

      expect(result.isValid).toBe(true);
      expect(result.owner).toBe('facebook');
      expect(result.repo).toBe('react');
      expect(result.branch).toBe('main');
      expect(result.path).toBe('');
    });

    it('should parse URL with branch and path', () => {
      const result = provider.parseUrl('https://github.com/facebook/react/tree/main/packages/react');

      expect(result.isValid).toBe(true);
      expect(result.owner).toBe('facebook');
      expect(result.repo).toBe('react');
      expect(result.branch).toBe('main');
      expect(result.path).toBe('packages/react');
    });

    it('should parse URL with complex branch name', () => {
      const result = provider.parseUrl('https://github.com/owner/repo/tree/feature/new-feature');

      expect(result.isValid).toBe(true);
      expect(result.branch).toBe('feature');
      expect(result.path).toBe('new-feature');
    });

    it('should handle trailing slash', () => {
      const result = provider.parseUrl('https://github.com/owner/repo/');

      expect(result.isValid).toBe(true);
      expect(result.owner).toBe('owner');
      expect(result.repo).toBe('repo');
    });

    it('should return error for invalid URL', () => {
      const result = provider.parseUrl('invalid-url');

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('fetchTree', () => {
    it('should fetch tree for basic repo URL', async () => {
      const tree = await provider.fetchTree('https://github.com/owner/repo');

      expect(tree).toBeDefined();
      expect(Array.isArray(tree)).toBe(true);
      expect(tree.length).toBe(3);
      expect(tree[0].path).toBe('README.md');
      expect(tree[0].type).toBe('blob');
    });

    it('should store repo metadata', async () => {
      await provider.fetchTree('https://github.com/owner/repo');

      const metadata = provider.getRepoInfo();
      expect(metadata).toBeDefined();
      expect(metadata?.type).toBe('github');
      expect(metadata?.owner).toBe('owner');
      expect(metadata?.name).toBe('repo');
    });

    it('should throw error for invalid URL', async () => {
      await expect(provider.fetchTree('invalid-url')).rejects.toThrow();
    });

    it('should handle network errors', async () => {
      server.use(
        http.get('https://api.github.com/repos/:owner/:repo/contents', () => {
          return HttpResponse.error();
        })
      );

      await expect(provider.fetchTree('https://github.com/owner/repo')).rejects.toThrow();
    });

    it('should handle rate limit errors', async () => {
      server.use(
        http.get('https://api.github.com/repos/:owner/:repo/contents', () => {
          return new HttpResponse(null, {
            status: 403,
            statusText: 'Rate limit exceeded',
          });
        })
      );

      try {
        await provider.fetchTree('https://github.com/owner/repo');
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.code).toBe(ErrorCode.RATE_LIMITED);
        expect(error.recovery).toBeDefined();
      }
    });
  });

  describe('fetchFile', () => {
    it('should fetch file content', async () => {
      const fileNode: FileNode = {
        path: 'src/index.ts',
        type: 'blob',
        url: 'https://api.github.com/repos/owner/repo/git/blobs/sha123',
        urlType: 'api',
        sha: 'sha123',
      };

      const content = await provider.fetchFile(fileNode);

      expect(content).toBeDefined();
      expect(content.path).toBe('src/index.ts');
      expect(content.text).toBe('console.log("Hello");');
    });

    it('should handle file fetch errors', async () => {
      server.use(
        http.get('https://api.github.com/repos/:owner/:repo/git/blobs/:sha', () => {
          return HttpResponse.error();
        })
      );

      const fileNode: FileNode = {
        path: 'src/index.ts',
        type: 'blob',
        url: 'https://api.github.com/repos/owner/repo/git/blobs/sha123',
        urlType: 'api',
        sha: 'sha123',
      };

      await expect(provider.fetchFile(fileNode)).rejects.toThrow();
    });
  });

  describe('setCredentials', () => {
    it('should set credentials', () => {
      const token = 'ghp_testtoken123';
      provider.setCredentials({ token });

      // Credentials should be set (we can't directly test private field)
      // but we can verify it doesn't throw
      expect(() => provider.setCredentials({ token })).not.toThrow();
    });
  });

  describe('requiresAuth', () => {
    it('should return false for public repos', () => {
      expect(provider.requiresAuth()).toBe(false);
    });
  });

  describe('reset', () => {
    it('should reset provider state', async () => {
      await provider.fetchTree('https://github.com/owner/repo');
      expect(provider.getRepoInfo()).toBeDefined();

      provider.reset();
      expect(provider.getRepoInfo()).toBeNull();
    });
  });

  describe('fetchMultiple', () => {
    it('should fetch multiple files', async () => {
      const fileNodes: FileNode[] = [
        {
          path: 'file1.ts',
          type: 'blob',
          url: 'https://api.github.com/repos/owner/repo/git/blobs/sha1',
          urlType: 'api',
          sha: 'sha1',
        },
        {
          path: 'file2.ts',
          type: 'blob',
          url: 'https://api.github.com/repos/owner/repo/git/blobs/sha2',
          urlType: 'api',
          sha: 'sha2',
        },
      ];

      const results: string[] = [];
      for await (const content of provider.fetchMultiple(fileNodes)) {
        results.push(content.path);
      }

      expect(results).toHaveLength(2);
      expect(results).toContain('file1.ts');
      expect(results).toContain('file2.ts');
    });
  });
});
