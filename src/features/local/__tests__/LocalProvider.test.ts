import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LocalProvider } from '../LocalProvider';
import { ErrorCode } from '@/lib/providers/types';
import JSZip from 'jszip';

// Mock File and FileList
class MockFile extends File {
  constructor(
    content: string,
    name: string,
    options?: FilePropertyBag & { webkitRelativePath?: string }
  ) {
    super([content], name, options);
    if (options?.webkitRelativePath) {
      Object.defineProperty(this, 'webkitRelativePath', {
        value: options.webkitRelativePath,
        writable: false,
      });
    }
  }
}

function createMockFileList(files: MockFile[]): FileList {
  const fileList: any = files;
  fileList.item = (index: number) => files[index] || null;
  fileList.length = files.length;
  return fileList as FileList;
}

describe('LocalProvider', () => {
  let provider: LocalProvider;

  beforeEach(() => {
    provider = new LocalProvider();
  });

  describe('getType and getName', () => {
    it('should return correct type', () => {
      expect(provider.getType()).toBe('local');
    });

    it('should return correct name', () => {
      expect(provider.getName()).toBe('Local');
    });
  });

  describe('requiresAuth', () => {
    it('should return false', () => {
      expect(provider.requiresAuth()).toBe(false);
    });
  });

  describe('validateUrl', () => {
    it('should validate local:// URLs', () => {
      expect(provider.validateUrl('local://')).toBe(true);
      expect(provider.validateUrl('local://directory')).toBe(true);
      expect(provider.validateUrl('local://zip')).toBe(true);
    });

    it('should reject other URLs', () => {
      expect(provider.validateUrl('https://github.com/owner/repo')).toBe(false);
      expect(provider.validateUrl('file://')).toBe(false);
      expect(provider.validateUrl('')).toBe(false);
    });
  });

  describe('parseUrl', () => {
    it('should parse valid local URLs', () => {
      const result = provider.parseUrl('local://');
      expect(result.isValid).toBe(true);
      expect(result.url).toBe('local://');
    });

    it('should return error for invalid URLs', () => {
      const result = provider.parseUrl('https://github.com');
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('initialize with directory', () => {
    it('should initialize with directory files', async () => {
      const files = createMockFileList([
        new MockFile('content1', 'file1.txt', { webkitRelativePath: 'test-dir/file1.txt' }),
        new MockFile('content2', 'file2.txt', { webkitRelativePath: 'test-dir/file2.txt' }),
      ]);

      await provider.initialize({
        source: 'directory',
        files,
      });

      const repoInfo = provider.getRepoInfo();
      expect(repoInfo).toBeDefined();
      expect(repoInfo?.type).toBe('local');
      expect(repoInfo?.name).toBe('test-dir');
    });

    it('should throw error if no files provided', async () => {
      await expect(
        provider.initialize({
          source: 'directory',
          files: createMockFileList([]),
        })
      ).rejects.toThrow();
    });
  });

  describe('initialize with zip', () => {
    it('should initialize with zip file', async () => {
      const zip = new JSZip();
      zip.file('test.txt', 'Hello World');
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const zipFile = new File([zipBlob], 'test.zip', { type: 'application/zip' });

      await provider.initialize({
        source: 'zip',
        zipFile,
      });

      const repoInfo = provider.getRepoInfo();
      expect(repoInfo).toBeDefined();
      expect(repoInfo?.type).toBe('local');
      expect(repoInfo?.name).toBe('test');
    });

    it('should throw error if no zip file provided', async () => {
      await expect(
        provider.initialize({
          source: 'zip',
        })
      ).rejects.toThrow();
    });

    it('should call progress callback', async () => {
      const onProgress = vi.fn();
      const zip = new JSZip();
      zip.file('test.txt', 'Hello');
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const zipFile = new File([zipBlob], 'test.zip');

      await provider.initialize({
        source: 'zip',
        zipFile,
        onProgress,
      });

      expect(onProgress).toHaveBeenCalled();
    });
  });

  describe('fetchTree', () => {
    it('should fetch tree from directory', async () => {
      const files = createMockFileList([
        new MockFile('content1', 'file1.txt', { webkitRelativePath: 'test-dir/file1.txt' }),
        new MockFile('content2', 'file2.txt', { webkitRelativePath: 'test-dir/sub/file2.txt' }),
      ]);

      await provider.initialize({
        source: 'directory',
        files,
      });

      const tree = await provider.fetchTree('local://');

      expect(tree).toHaveLength(2);
      expect(tree[0].path).toBe('test-dir/file1.txt');
      expect(tree[0].type).toBe('blob');
      expect(tree[0].urlType).toBe('directory');
    });

    it('should fetch tree from zip', async () => {
      const zip = new JSZip();
      zip.file('file1.txt', 'content1');
      zip.file('sub/file2.txt', 'content2');
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const zipFile = new File([zipBlob], 'test.zip');

      await provider.initialize({
        source: 'zip',
        zipFile,
      });

      const tree = await provider.fetchTree('local://');

      expect(tree.length).toBeGreaterThan(0);
      expect(tree[0].type).toBe('blob');
      expect(tree[0].urlType).toBe('zip');
    });

    it('should throw error if not initialized', async () => {
      await expect(provider.fetchTree('local://')).rejects.toThrow();
    });
  });

  describe('fetchFile', () => {
    it('should fetch file from directory', async () => {
      const files = createMockFileList([
        new MockFile('Hello World', 'file1.txt', { webkitRelativePath: 'test-dir/file1.txt' }),
      ]);

      await provider.initialize({
        source: 'directory',
        files,
      });

      const tree = await provider.fetchTree('local://');
      const content = await provider.fetchFile(tree[0]);

      expect(content.path).toBe('test-dir/file1.txt');
      expect(content.text).toBe('Hello World');
      expect(content.lineCount).toBe(1);
    });

    it('should fetch file from zip', async () => {
      const zip = new JSZip();
      zip.file('test.txt', 'Zip Content');
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const zipFile = new File([zipBlob], 'test.zip');

      await provider.initialize({
        source: 'zip',
        zipFile,
      });

      const tree = await provider.fetchTree('local://');
      const content = await provider.fetchFile(tree[0]);

      expect(content.text).toBe('Zip Content');
    });

    it('should throw error for non-existent file', async () => {
      const files = createMockFileList([
        new MockFile('content', 'file1.txt', { webkitRelativePath: 'test-dir/file1.txt' }),
      ]);

      await provider.initialize({
        source: 'directory',
        files,
      });

      await expect(
        provider.fetchFile({
          path: 'nonexistent.txt',
          type: 'blob',
          urlType: 'directory',
        })
      ).rejects.toThrow();
    });
  });

  describe('reset', () => {
    it('should reset provider state', async () => {
      const files = createMockFileList([
        new MockFile('content', 'file1.txt', { webkitRelativePath: 'test-dir/file1.txt' }),
      ]);

      await provider.initialize({
        source: 'directory',
        files,
      });

      expect(provider.getRepoInfo()).toBeDefined();

      provider.reset();

      expect(provider.getRepoInfo()).toBeNull();
    });
  });

  describe('fetchMultiple', () => {
    it('should fetch multiple files', async () => {
      const files = createMockFileList([
        new MockFile('content1', 'file1.txt', { webkitRelativePath: 'test-dir/file1.txt' }),
        new MockFile('content2', 'file2.txt', { webkitRelativePath: 'test-dir/file2.txt' }),
      ]);

      await provider.initialize({
        source: 'directory',
        files,
      });

      const tree = await provider.fetchTree('local://');
      const results: string[] = [];

      for await (const content of provider.fetchMultiple(tree)) {
        results.push(content.path);
      }

      expect(results).toHaveLength(2);
      expect(results).toContain('test-dir/file1.txt');
      expect(results).toContain('test-dir/file2.txt');
    });
  });
});
