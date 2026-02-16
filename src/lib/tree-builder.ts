/**
 * Tree building utilities
 * Converts flat file nodes to hierarchical tree structure
 */

import type { FileNode, TreeNode } from '@/types';

export interface TreeBuilderOptions {
  selectedPaths: Set<string>;
  excludedPaths: Set<string>;
  expandedPaths: Set<string>;
  getDirectorySelectionState: (path: string) => 'checked' | 'unchecked' | 'indeterminate';
}

/**
 * Build hierarchical tree from flat file nodes
 */
export function buildTree(nodes: FileNode[], options: TreeBuilderOptions): TreeNode[] {
  const { selectedPaths, excludedPaths, expandedPaths, getDirectorySelectionState } = options;

  // Sort nodes by path depth for proper hierarchy building
  const sortedNodes = [...nodes].sort((a, b) => {
    const depthA = a.path.split('/').length;
    const depthB = b.path.split('/').length;
    return depthA - depthB;
  });

  const root: TreeNode[] = [];
  const dirs = new Map<string, TreeNode>();

  sortedNodes.forEach((node) => {
    const parts = node.path.split('/');
    const name = parts[parts.length - 1];
    const parentPath = parts.slice(0, -1).join('/');

    const isDirectory = node.type === 'tree';
    const isFile = node.type === 'blob';

    let selected: boolean | 'indeterminate' = false;
    if (isDirectory) {
      const state = getDirectorySelectionState(node.path);
      selected = state === 'checked' ? true : state === 'indeterminate' ? 'indeterminate' : false;
    } else {
      selected = selectedPaths.has(node.path);
    }

    const treeNode: TreeNode = {
      name,
      path: node.path,
      type: isDirectory ? 'directory' : 'file',
      selected,
      visible: true,
      excluded: excludedPaths.has(node.path),
    };

    if (isDirectory) {
      // Only include children if directory is expanded
      if (expandedPaths.has(node.path)) {
        treeNode.children = [];
      }
      dirs.set(node.path, treeNode);
    }

    if (parentPath && dirs.has(parentPath)) {
      // Add to parent's children if parent exists and is expanded
      const parent = dirs.get(parentPath)!;
      if (parent.children) {
        parent.children.push(treeNode);
      }
    } else {
      // Root level node
      root.push(treeNode);
    }
  });

  // Sort function: directories first, then files, both alphabetically
  const sortNodes = (a: TreeNode, b: TreeNode) => {
    if (a.type === 'directory' && b.type === 'file') return -1;
    if (a.type === 'file' && b.type === 'directory') return 1;
    return a.name.localeCompare(b.name);
  };

  // Sort root level
  root.sort(sortNodes);

  // Sort all children recursively
  const sortChildren = (node: TreeNode) => {
    if (node.children) {
      node.children.sort(sortNodes);
      node.children.forEach(sortChildren);
    }
  };
  root.forEach(sortChildren);

  return root;
}

/**
 * Get all directory paths from file nodes
 */
export function extractDirectories(nodes: FileNode[]): string[] {
  const dirs = new Set<string>();

  nodes.forEach((node) => {
    const parts = node.path.split('/');
    // Add all parent directories
    for (let i = 1; i < parts.length; i++) {
      dirs.add(parts.slice(0, i).join('/'));
    }
  });

  return Array.from(dirs);
}
