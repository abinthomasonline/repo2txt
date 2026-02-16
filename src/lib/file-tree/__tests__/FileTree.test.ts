import { describe, it, expect, beforeEach } from 'vitest';
import { FileTree } from '../FileTree';
import type { FileNode as IFileNode } from '@/types';

describe('FileTree', () => {
  let sampleNodes: IFileNode[];

  beforeEach(() => {
    sampleNodes = [
      { path: 'README.md', type: 'blob' },
      { path: 'package.json', type: 'blob' },
      { path: 'src', type: 'tree' },
      { path: 'src/index.ts', type: 'blob' },
      { path: 'src/App.tsx', type: 'blob' },
      { path: 'src/components', type: 'tree' },
      { path: 'src/components/Button.tsx', type: 'blob' },
      { path: 'tests', type: 'tree' },
      { path: 'tests/App.test.ts', type: 'blob' },
    ];
  });

  describe('constructor', () => {
    it('should create empty tree', () => {
      const tree = new FileTree();
      expect(tree.size()).toBe(0);
    });

    it('should create tree with nodes', () => {
      const tree = new FileTree(sampleNodes);
      expect(tree.size()).toBe(9);
    });
  });

  describe('node management', () => {
    it('should add nodes', () => {
      const tree = new FileTree();
      tree.addNodes(sampleNodes);
      expect(tree.size()).toBe(9);
    });

    it('should get node by path', () => {
      const tree = new FileTree(sampleNodes);
      const node = tree.getNode('src/App.tsx');
      expect(node?.path).toBe('src/App.tsx');
    });

    it('should check if node exists', () => {
      const tree = new FileTree(sampleNodes);
      expect(tree.hasNode('src/App.tsx')).toBe(true);
      expect(tree.hasNode('nonexistent.js')).toBe(false);
    });

    it('should get all nodes', () => {
      const tree = new FileTree(sampleNodes);
      expect(tree.getAllNodes()).toHaveLength(9);
    });
  });

  describe('filtering by type', () => {
    it('should get only file nodes', () => {
      const tree = new FileTree(sampleNodes);
      const files = tree.getFileNodes();
      expect(files).toHaveLength(6);
      files.forEach((node) => expect(node.isFile()).toBe(true));
    });

    it('should get only directory nodes', () => {
      const tree = new FileTree(sampleNodes);
      const dirs = tree.getDirectoryNodes();
      expect(dirs).toHaveLength(3);
      dirs.forEach((node) => expect(node.isDirectory()).toBe(true));
    });
  });

  describe('selection', () => {
    it('should select a node', () => {
      const tree = new FileTree(sampleNodes);
      tree.selectNode('src/App.tsx');

      const node = tree.getNode('src/App.tsx');
      expect(node?.selected).toBe(true);
    });

    it('should deselect a node', () => {
      const tree = new FileTree(sampleNodes);
      tree.selectNode('src/App.tsx');
      tree.deselectNode('src/App.tsx');

      const node = tree.getNode('src/App.tsx');
      expect(node?.selected).toBe(false);
    });

    it('should toggle selection', () => {
      const tree = new FileTree(sampleNodes);
      const path = 'src/App.tsx';

      tree.toggleSelection(path);
      expect(tree.getNode(path)?.selected).toBe(true);

      tree.toggleSelection(path);
      expect(tree.getNode(path)?.selected).toBe(false);
    });

    it('should select entire directory', () => {
      const tree = new FileTree(sampleNodes);
      tree.selectDirectory('src');

      expect(tree.getNode('src')?.selected).toBe(true);
      expect(tree.getNode('src/index.ts')?.selected).toBe(true);
      expect(tree.getNode('src/App.tsx')?.selected).toBe(true);
      expect(tree.getNode('src/components/Button.tsx')?.selected).toBe(true);
    });

    it('should deselect entire directory', () => {
      const tree = new FileTree(sampleNodes);
      tree.selectDirectory('src', true);
      tree.selectDirectory('src', false);

      expect(tree.getNode('src')?.selected).toBe(false);
      expect(tree.getNode('src/index.ts')?.selected).toBe(false);
    });

    it('should get selected nodes', () => {
      const tree = new FileTree(sampleNodes);
      tree.selectNode('README.md');
      tree.selectNode('src/App.tsx');

      const selected = tree.getSelectedNodes();
      expect(selected).toHaveLength(2);
    });
  });

  describe('filterByExtension', () => {
    it('should filter by single extension', () => {
      const tree = new FileTree(sampleNodes);
      tree.filterByExtension(['.tsx']);

      const visible = tree.getVisibleNodes();
      expect(visible.every((n) => n.getExtension() === '.tsx' || n.isDirectory())).toBe(true);
    });

    it('should filter by multiple extensions', () => {
      const tree = new FileTree(sampleNodes);
      tree.filterByExtension(['.tsx', '.ts']);

      const visible = tree.getVisibleNodes();
      const extensions = ['.tsx', '.ts', ''];
      expect(visible.every((n) => extensions.includes(n.getExtension()) || n.isDirectory())).toBe(true);
    });
  });

  describe('gitignore patterns', () => {
    it('should exclude files matching pattern', () => {
      const tree = new FileTree(sampleNodes);
      tree.applyGitignore(['*.md']);

      expect(tree.getNode('README.md')?.excluded).toBe(true);
      expect(tree.getNode('package.json')?.excluded).toBe(false);
    });

    it('should handle directory patterns', () => {
      const tree = new FileTree(sampleNodes);
      tree.applyGitignore(['tests/']);

      expect(tree.getNode('tests')?.excluded).toBe(true);
      expect(tree.getNode('tests/App.test.ts')?.excluded).toBe(true);
    });

    it('should handle wildcards', () => {
      const tree = new FileTree(sampleNodes);
      tree.applyGitignore(['*.test.*']);

      expect(tree.getNode('tests/App.test.ts')?.excluded).toBe(true);
      expect(tree.getNode('src/App.tsx')?.excluded).toBe(false);
    });

    it('should skip empty lines and comments', () => {
      const tree = new FileTree(sampleNodes);
      tree.applyGitignore(['', '# comment', '  ', '*.md']);

      // Only .md files should be excluded
      expect(tree.getNode('README.md')?.excluded).toBe(true);
      expect(tree.getAllNodes().filter((n) => n.excluded)).toHaveLength(1);
    });
  });

  describe('getExtensionCounts', () => {
    it('should count files by extension', () => {
      const tree = new FileTree(sampleNodes);
      const counts = tree.getExtensionCounts();

      expect(counts.get('.md')).toBe(1);
      expect(counts.get('.json')).toBe(1);
      expect(counts.get('.ts')).toBe(2);
      expect(counts.get('.tsx')).toBe(2);
    });
  });

  describe('clear', () => {
    it('should remove all nodes', () => {
      const tree = new FileTree(sampleNodes);
      expect(tree.size()).toBe(9);

      tree.clear();
      expect(tree.size()).toBe(0);
    });
  });

  describe('toJSON', () => {
    it('should serialize to array of plain objects', () => {
      const tree = new FileTree(sampleNodes);
      const json = tree.toJSON();

      expect(json).toHaveLength(9);
      expect(json[0]).toHaveProperty('path');
      expect(json[0]).toHaveProperty('type');
    });
  });
});
