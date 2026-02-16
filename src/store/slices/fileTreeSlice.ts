import { StateCreator } from 'zustand';
import { FileNode, TreeNode } from '@/types';

export interface FileTreeSlice {
  nodes: FileNode[];
  tree: TreeNode | null;
  selectedPaths: Set<string>;
  expandedPaths: Set<string>;
  extensions: Map<string, { count: number; selected: boolean }>;
  gitignorePatterns: string[];

  setNodes: (nodes: FileNode[]) => void;
  setTree: (tree: TreeNode | null) => void;
  toggleSelection: (path: string) => void;
  toggleDirectory: (path: string, selected: boolean) => void;
  toggleExtension: (extension: string, selected: boolean) => void;
  toggleExpanded: (path: string) => void;
  setGitignorePatterns: (patterns: string[]) => void;
  getSelectedNodes: () => FileNode[];
  reset: () => void;
}

const initialState = {
  nodes: [],
  tree: null,
  selectedPaths: new Set<string>(),
  expandedPaths: new Set<string>(),
  extensions: new Map<string, { count: number; selected: boolean }>(),
  gitignorePatterns: [],
};

export const createFileTreeSlice: StateCreator<FileTreeSlice> = (set, get) => ({
  ...initialState,

  setNodes: (nodes: FileNode[]) => {
    // Build extensions map
    const extensionsMap = new Map<string, { count: number; selected: boolean }>();
    const commonExtensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.html', '.css'];

    nodes.forEach((node) => {
      if (node.type === 'blob') {
        const parts = node.path.split('.');
        if (parts.length > 1) {
          const ext = '.' + parts[parts.length - 1];
          const current = extensionsMap.get(ext) || { count: 0, selected: false };
          extensionsMap.set(ext, {
            count: current.count + 1,
            selected: commonExtensions.includes(ext),
          });
        }
      }
    });

    // Auto-select common extensions
    const selectedPaths = new Set<string>();
    nodes.forEach((node) => {
      if (node.type === 'blob') {
        const parts = node.path.split('.');
        if (parts.length > 1) {
          const ext = '.' + parts[parts.length - 1];
          if (extensionsMap.get(ext)?.selected) {
            selectedPaths.add(node.path);
          }
        }
      }
    });

    set({ nodes, extensions: extensionsMap, selectedPaths });
  },

  setTree: (tree: TreeNode | null) => set({ tree }),

  toggleSelection: (path: string) => {
    const { selectedPaths } = get();
    const newSelected = new Set(selectedPaths);
    if (newSelected.has(path)) {
      newSelected.delete(path);
    } else {
      newSelected.add(path);
    }
    set({ selectedPaths: newSelected });
  },

  toggleDirectory: (path: string, selected: boolean) => {
    const { nodes, selectedPaths } = get();
    const newSelected = new Set(selectedPaths);

    nodes.forEach((node) => {
      if (node.path.startsWith(path)) {
        if (selected) {
          newSelected.add(node.path);
        } else {
          newSelected.delete(node.path);
        }
      }
    });

    set({ selectedPaths: newSelected });
  },

  toggleExtension: (extension: string, selected: boolean) => {
    const { nodes, extensions, selectedPaths } = get();
    const newExtensions = new Map(extensions);
    const ext = newExtensions.get(extension);
    if (ext) {
      newExtensions.set(extension, { ...ext, selected });
    }

    const newSelected = new Set(selectedPaths);
    nodes.forEach((node) => {
      if (node.type === 'blob' && node.path.endsWith(extension)) {
        if (selected) {
          newSelected.add(node.path);
        } else {
          newSelected.delete(node.path);
        }
      }
    });

    set({ extensions: newExtensions, selectedPaths: newSelected });
  },

  toggleExpanded: (path: string) => {
    const { expandedPaths } = get();
    const newExpanded = new Set(expandedPaths);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    set({ expandedPaths: newExpanded });
  },

  setGitignorePatterns: (patterns: string[]) => set({ gitignorePatterns: patterns }),

  getSelectedNodes: () => {
    const { nodes, selectedPaths } = get();
    return nodes.filter((node) => selectedPaths.has(node.path));
  },

  reset: () => set(initialState),
});
