/**
 * FileTree class for managing file structure with selection and filtering
 */

import type { FileNode as IFileNode } from '@/types';
import { FileNode } from './FileNode';

export class FileTree {
  public nodes: Map<string, FileNode> = new Map();

  constructor(nodes: IFileNode[] = []) {
    this.addNodes(nodes);
  }

  /**
   * Add nodes to the tree
   */
  addNodes(nodes: IFileNode[]): void {
    nodes.forEach((nodeData) => {
      const node = new FileNode(nodeData);
      this.nodes.set(node.path, node);
    });
  }

  /**
   * Get a node by path
   */
  getNode(path: string): FileNode | undefined {
    return this.nodes.get(path);
  }

  /**
   * Check if a node exists
   */
  hasNode(path: string): boolean {
    return this.nodes.has(path);
  }

  /**
   * Get all nodes
   */
  getAllNodes(): FileNode[] {
    return Array.from(this.nodes.values());
  }

  /**
   * Get only file nodes (blobs)
   */
  getFileNodes(): FileNode[] {
    return this.getAllNodes().filter((node) => node.isFile());
  }

  /**
   * Get only directory nodes (trees)
   */
  getDirectoryNodes(): FileNode[] {
    return this.getAllNodes().filter((node) => node.isDirectory());
  }

  /**
   * Get visible nodes (not excluded)
   */
  getVisibleNodes(): FileNode[] {
    return this.getAllNodes().filter((node) => node.visible && !node.excluded);
  }

  /**
   * Get selected nodes
   */
  getSelectedNodes(): FileNode[] {
    return this.getAllNodes().filter((node) => node.selected);
  }

  /**
   * Select a node by path
   */
  selectNode(path: string): void {
    const node = this.getNode(path);
    if (node) {
      node.selected = true;
    }
  }

  /**
   * Deselect a node by path
   */
  deselectNode(path: string): void {
    const node = this.getNode(path);
    if (node) {
      node.selected = false;
    }
  }

  /**
   * Toggle selection of a node
   */
  toggleSelection(path: string): void {
    const node = this.getNode(path);
    if (node) {
      node.selected = !node.selected;
    }
  }

  /**
   * Select all nodes in a directory (recursively)
   */
  selectDirectory(dirPath: string, selected: boolean = true): void {
    this.getAllNodes().forEach((node) => {
      if (node.path === dirPath || node.isChildOf(dirPath)) {
        node.selected = selected;
      }
    });
  }

  /**
   * Filter nodes by extension
   */
  filterByExtension(extensions: string[]): FileTree {
    const extSet = new Set(extensions);
    const newTree = this.clone();

    newTree.getAllNodes().forEach((node) => {
      if (node.isFile()) {
        const ext = node.getExtension();
        node.visible = extSet.has(ext);
      }
    });

    return newTree;
  }

  /**
   * Apply gitignore patterns
   */
  applyGitignore(patterns: string[]): FileTree {
    const regexes = patterns.map((pattern) => this.patternToRegex(pattern));
    const newTree = this.clone();

    newTree.getAllNodes().forEach((node) => {
      node.excluded = regexes.some((regex) => regex.test(node.path));
    });

    return newTree;
  }

  /**
   * Convert gitignore pattern to regex
   */
  private patternToRegex(pattern: string): RegExp {
    // Remove leading/trailing whitespace
    pattern = pattern.trim();

    // Skip empty lines and comments
    if (!pattern || pattern.startsWith('#')) {
      return /(?!)/; // Never matches
    }

    const isDirectory = pattern.endsWith('/');
    if (isDirectory) {
      pattern = pattern.slice(0, -1); // Remove trailing slash
    }

    // Escape special regex characters except * and ?
    let regexPattern = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');

    // Handle root-level patterns (starting with /)
    if (pattern.startsWith('/')) {
      regexPattern = '^' + regexPattern.slice(2); // Remove leading / and escaped slash
    } else {
      // Pattern can match anywhere in path
      regexPattern = '(^|/)' + regexPattern;
    }

    // Handle directory patterns
    if (isDirectory) {
      regexPattern = regexPattern + '($|/.*)';
    } else {
      regexPattern = regexPattern + '$';
    }

    try {
      return new RegExp(regexPattern);
    } catch {
      // Invalid pattern, never matches
      return /(?!)/;
    }
  }

  /**
   * Get file count by extension
   */
  getExtensionCounts(): Map<string, number> {
    const counts = new Map<string, number>();

    this.getFileNodes().forEach((node) => {
      const ext = node.getExtension();
      counts.set(ext, (counts.get(ext) || 0) + 1);
    });

    return counts;
  }

  /**
   * Alias for getExtensionCounts (for compatibility)
   */
  getExtensions(): Map<string, number> {
    return this.getExtensionCounts();
  }

  /**
   * Clone the tree
   */
  clone(): FileTree {
    const cloned = new FileTree();
    this.getAllNodes().forEach((node) => {
      const clonedNode = new FileNode(node.toJSON());
      clonedNode.selected = node.selected;
      clonedNode.visible = node.visible;
      clonedNode.excluded = node.excluded;
      cloned.nodes.set(node.path, clonedNode);
    });
    return cloned;
  }

  /**
   * Build hierarchical tree structure from flat nodes
   */
  buildTree(): import('@/types').TreeNode[] {
    const root: import('@/types').TreeNode[] = [];
    const dirs = new Map<string, import('@/types').TreeNode>();

    // Sort nodes by path depth
    const sortedNodes = this.getAllNodes().sort((a, b) => {
      const depthA = a.path.split('/').length;
      const depthB = b.path.split('/').length;
      return depthA - depthB;
    });

    sortedNodes.forEach((node) => {
      const parts = node.path.split('/');
      const name = parts[parts.length - 1];
      const parentPath = parts.slice(0, -1).join('/');

      const treeNode: import('@/types').TreeNode = {
        name,
        path: node.path,
        type: node.isFile() ? 'file' : 'directory',
        selected: node.selected,
        visible: node.visible,
        excluded: node.excluded,
      };

      if (node.isDirectory()) {
        treeNode.children = [];
        dirs.set(node.path, treeNode);
      }

      if (parentPath && dirs.has(parentPath)) {
        dirs.get(parentPath)!.children!.push(treeNode);
      } else {
        root.push(treeNode);
      }
    });

    return root;
  }

  /**
   * Get total number of nodes
   */
  size(): number {
    return this.nodes.size;
  }

  /**
   * Clear all nodes
   */
  clear(): void {
    this.nodes.clear();
  }

  /**
   * Convert to array of plain objects
   */
  toJSON(): IFileNode[] {
    return this.getAllNodes().map((node) => node.toJSON());
  }
}
