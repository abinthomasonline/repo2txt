import { describe, it, expect } from 'vitest';
import { FileNode } from '../FileNode';

describe('FileNode', () => {
  describe('constructor', () => {
    it('should create a file node with required properties', () => {
      const node = new FileNode({
        path: 'src/App.tsx',
        type: 'blob',
      });

      expect(node.path).toBe('src/App.tsx');
      expect(node.type).toBe('blob');
      expect(node.selected).toBe(false);
      expect(node.visible).toBe(true);
      expect(node.excluded).toBe(false);
    });

    it('should create a directory node', () => {
      const node = new FileNode({
        path: 'src',
        type: 'tree',
      });

      expect(node.type).toBe('tree');
      expect(node.isDirectory()).toBe(true);
      expect(node.isFile()).toBe(false);
    });

    it('should accept optional properties', () => {
      const node = new FileNode({
        path: 'README.md',
        type: 'blob',
        url: 'https://api.github.com/repos/owner/repo/contents/README.md',
        urlType: 'api',
        size: 1234,
        sha: 'abc123',
      });

      expect(node.url).toBe('https://api.github.com/repos/owner/repo/contents/README.md');
      expect(node.urlType).toBe('api');
      expect(node.size).toBe(1234);
      expect(node.sha).toBe('abc123');
    });
  });

  describe('getName', () => {
    it('should return file name from path', () => {
      const node = new FileNode({ path: 'src/components/Button.tsx', type: 'blob' });
      expect(node.getName()).toBe('Button.tsx');
    });

    it('should return directory name', () => {
      const node = new FileNode({ path: 'src/components', type: 'tree' });
      expect(node.getName()).toBe('components');
    });

    it('should handle root level files', () => {
      const node = new FileNode({ path: 'README.md', type: 'blob' });
      expect(node.getName()).toBe('README.md');
    });
  });

  describe('getDirectory', () => {
    it('should return directory path', () => {
      const node = new FileNode({ path: 'src/components/Button.tsx', type: 'blob' });
      expect(node.getDirectory()).toBe('src/components');
    });

    it('should return empty string for root files', () => {
      const node = new FileNode({ path: 'README.md', type: 'blob' });
      expect(node.getDirectory()).toBe('');
    });
  });

  describe('getExtension', () => {
    it('should return file extension with dot', () => {
      const node = new FileNode({ path: 'App.tsx', type: 'blob' });
      expect(node.getExtension()).toBe('.tsx');
    });

    it('should handle multiple dots', () => {
      const node = new FileNode({ path: 'app.test.ts', type: 'blob' });
      expect(node.getExtension()).toBe('.ts');
    });

    it('should return empty string for no extension', () => {
      const node = new FileNode({ path: 'Makefile', type: 'blob' });
      expect(node.getExtension()).toBe('');
    });
  });

  describe('getDepth', () => {
    it('should return 0 for root level', () => {
      const node = new FileNode({ path: 'README.md', type: 'blob' });
      expect(node.getDepth()).toBe(0);
    });

    it('should return 1 for first level', () => {
      const node = new FileNode({ path: 'src/App.tsx', type: 'blob' });
      expect(node.getDepth()).toBe(1);
    });

    it('should return correct depth for nested paths', () => {
      const node = new FileNode({ path: 'src/components/ui/Button.tsx', type: 'blob' });
      expect(node.getDepth()).toBe(3);
    });
  });

  describe('isChildOf', () => {
    it('should return true for direct child', () => {
      const node = new FileNode({ path: 'src/App.tsx', type: 'blob' });
      expect(node.isChildOf('src')).toBe(true);
    });

    it('should return true for nested child', () => {
      const node = new FileNode({ path: 'src/components/Button.tsx', type: 'blob' });
      expect(node.isChildOf('src')).toBe(true);
    });

    it('should return false for non-child', () => {
      const node = new FileNode({ path: 'tests/App.test.tsx', type: 'blob' });
      expect(node.isChildOf('src')).toBe(false);
    });

    it('should return false for same path', () => {
      const node = new FileNode({ path: 'src', type: 'tree' });
      expect(node.isChildOf('src')).toBe(false);
    });
  });

  describe('toJSON', () => {
    it('should serialize to plain object', () => {
      const node = new FileNode({
        path: 'src/App.tsx',
        type: 'blob',
        url: 'https://example.com',
        urlType: 'api',
        size: 1234,
        sha: 'abc',
      });

      const json = node.toJSON();

      expect(json).toEqual({
        path: 'src/App.tsx',
        type: 'blob',
        url: 'https://example.com',
        urlType: 'api',
        size: 1234,
        sha: 'abc',
      });
    });
  });
});
