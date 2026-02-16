import { describe, it, expect } from 'vitest';
import {
  sanitizeFilename,
  extractGitHubRepoName,
  extractGitLabRepoName,
  extractAzureRepoName,
  extractLocalName,
  getDefaultFilename,
} from '../repoName';

describe('repoName utilities', () => {
  describe('sanitizeFilename', () => {
    it('should remove invalid filename characters', () => {
      expect(sanitizeFilename('hello<world>')).toBe('hello-world');
      expect(sanitizeFilename('test:file')).toBe('test-file');
      expect(sanitizeFilename('my/path\\file')).toBe('my-path-file');
    });

    it('should replace whitespace with dashes', () => {
      expect(sanitizeFilename('hello world')).toBe('hello-world');
      expect(sanitizeFilename('test   file')).toBe('test-file');
    });

    it('should replace multiple dashes with single dash', () => {
      expect(sanitizeFilename('hello---world')).toBe('hello-world');
      expect(sanitizeFilename('test--file')).toBe('test-file');
    });

    it('should remove leading and trailing dashes', () => {
      expect(sanitizeFilename('-hello-')).toBe('hello');
      expect(sanitizeFilename('--test--')).toBe('test');
    });

    it('should handle already valid filenames', () => {
      expect(sanitizeFilename('valid-filename')).toBe('valid-filename');
      expect(sanitizeFilename('test_file_123')).toBe('test_file_123');
    });
  });

  describe('extractGitHubRepoName', () => {
    it('should extract repo name from basic GitHub URL', () => {
      expect(extractGitHubRepoName('https://github.com/facebook/react')).toBe('react');
      expect(extractGitHubRepoName('https://github.com/vercel/next.js')).toBe('next.js');
    });

    it('should extract repo name from URL with branch', () => {
      expect(extractGitHubRepoName('https://github.com/facebook/react/tree/main')).toBe('react');
      expect(extractGitHubRepoName('https://github.com/vuejs/vue/tree/dev')).toBe('vue');
    });

    it('should extract repo name from URL with branch and path', () => {
      expect(extractGitHubRepoName('https://github.com/facebook/react/tree/main/packages')).toBe('react');
      expect(extractGitHubRepoName('https://github.com/microsoft/vscode/tree/main/src')).toBe('vscode');
    });

    it('should return default for invalid URLs', () => {
      expect(extractGitHubRepoName('https://github.com/user')).toBe('github-repo');
      expect(extractGitHubRepoName('invalid-url')).toBe('github-repo');
      expect(extractGitHubRepoName('')).toBe('github-repo');
    });

    it('should sanitize repo names with special characters', () => {
      expect(extractGitHubRepoName('https://github.com/user/repo:name')).toBe('repo-name');
    });
  });

  describe('extractGitLabRepoName', () => {
    it('should extract repo name from basic GitLab URL', () => {
      expect(extractGitLabRepoName('https://gitlab.com/gitlab-org/gitlab')).toBe('gitlab');
      expect(extractGitLabRepoName('https://gitlab.com/user/my-project')).toBe('my-project');
    });

    it('should extract repo name from URL with tree', () => {
      expect(extractGitLabRepoName('https://gitlab.com/gitlab-org/gitlab-foss/-/tree/master')).toBe('gitlab-foss');
      expect(extractGitLabRepoName('https://gitlab.com/user/project/-/tree/main/src')).toBe('project');
    });

    it('should extract repo name from nested groups', () => {
      expect(extractGitLabRepoName('https://gitlab.com/group/subgroup/project')).toBe('project');
    });

    it('should return default for invalid URLs', () => {
      expect(extractGitLabRepoName('invalid-url')).toBe('gitlab-repo');
      expect(extractGitLabRepoName('')).toBe('gitlab-repo');
    });
  });

  describe('extractAzureRepoName', () => {
    it('should extract repo name from Azure DevOps URL (modern format)', () => {
      expect(extractAzureRepoName('https://dev.azure.com/org/project/_git/repo')).toBe('repo');
      expect(extractAzureRepoName('https://dev.azure.com/microsoft/TypeScript/_git/TypeScript')).toBe('TypeScript');
    });

    it('should extract repo name from Azure DevOps URL (legacy format)', () => {
      expect(extractAzureRepoName('https://org.visualstudio.com/project/_git/repo')).toBe('repo');
    });

    it('should extract repo name from URL with path', () => {
      expect(extractAzureRepoName('https://dev.azure.com/org/project/_git/repo?path=/src')).toBe('repo');
    });

    it('should return default for invalid URLs', () => {
      expect(extractAzureRepoName('invalid-url')).toBe('azure-repo');
      expect(extractAzureRepoName('')).toBe('azure-repo');
      expect(extractAzureRepoName('https://dev.azure.com/org/project')).toBe('azure-repo');
    });
  });

  describe('extractLocalName', () => {
    it('should extract name from zip file', () => {
      const file = new File(['content'], 'my-project.zip', { type: 'application/zip' });
      expect(extractLocalName(file)).toBe('my-project');
    });

    it('should extract name from zip file with .ZIP extension', () => {
      const file = new File(['content'], 'PROJECT.ZIP', { type: 'application/zip' });
      expect(extractLocalName(file)).toBe('PROJECT');
    });

    it('should extract root directory name from FileList', () => {
      // Mock FileList with webkitRelativePath
      const mockFile1 = {
        name: 'file1.js',
        webkitRelativePath: 'my-project/src/file1.js',
      } as File;
      const mockFile2 = {
        name: 'file2.js',
        webkitRelativePath: 'my-project/src/file2.js',
      } as File;

      const fileList = [mockFile1, mockFile2] as unknown as FileList;
      Object.defineProperty(fileList, 'length', { value: 2 });

      expect(extractLocalName(fileList)).toBe('my-project');
    });

    it('should return default for empty FileList', () => {
      const fileList = [] as unknown as FileList;
      Object.defineProperty(fileList, 'length', { value: 0 });

      expect(extractLocalName(fileList)).toBe('local-files');
    });

    it('should sanitize extracted names', () => {
      const file = new File(['content'], 'my:project.zip', { type: 'application/zip' });
      expect(extractLocalName(file)).toBe('my-project');
    });
  });

  describe('getDefaultFilename', () => {
    it('should generate filename with timestamp', () => {
      const filename = getDefaultFilename('test-repo');
      expect(filename).toMatch(/^test-repo-\d{4}-\d{2}-\d{2}$/);
    });

    it('should use default prefix if not provided', () => {
      const filename = getDefaultFilename();
      expect(filename).toMatch(/^repo-\d{4}-\d{2}-\d{2}$/);
    });

    it('should sanitize the prefix', () => {
      const filename = getDefaultFilename('my:repo');
      expect(filename).toMatch(/^my-repo-\d{4}-\d{2}-\d{2}$/);
    });
  });
});
