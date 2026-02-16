import type { StateCreator } from 'zustand';
import type { FileNode, TreeNode } from '@/types';

// Common code file extensions that should be selected by default
export const CODE_EXTENSIONS = [
  '.js', '.jsx', '.ts', '.tsx',
  '.py', '.java', '.cpp', '.c', '.h', '.hpp',
  '.go', '.rs', '.rb', '.php',
  '.html', '.css', '.scss', '.sass', '.less',
  '.json', '.xml', '.yaml', '.yml',
  '.sh', '.bash', '.sql',
  '.swift', '.kt', '.scala', '.clj',
  '.vue', '.svelte',
];

export interface FileTreeSlice {
  nodes: FileNode[];
  tree: TreeNode[];
  selectedPaths: Set<string>;
  expandedPaths: Set<string>;
  excludedPaths: Set<string>;
  extensions: Map<string, { count: number; selected: boolean }>;
  gitignorePatterns: string[];

  setNodes: (nodes: FileNode[]) => void;
  setTree: (tree: TreeNode[]) => void;
  toggleSelection: (path: string) => void;
  selectNode: (path: string) => void;
  deselectNode: (path: string) => void;
  toggleDirectory: (path: string) => void;
  toggleExtension: (extension: string) => void;
  toggleExpanded: (path: string) => void;
  setGitignorePatterns: (patterns: string[]) => void;
  applyGitignore: () => void;
  getSelectedNodes: () => FileNode[];
  getDirectorySelectionState: (dirPath: string) => 'checked' | 'unchecked' | 'indeterminate';
  getExtensionSelectionState: (extension: string) => 'checked' | 'unchecked' | 'indeterminate';
  updateExtensionStates: () => void;
  getGlobalSelectionState: () => 'checked' | 'unchecked' | 'indeterminate';
  selectAll: () => void;
  deselectAll: () => void;
  reset: () => void;
}

const initialState = {
  nodes: [],
  tree: [],
  selectedPaths: new Set<string>(),
  expandedPaths: new Set<string>(),
  excludedPaths: new Set<string>(),
  extensions: new Map<string, { count: number; selected: boolean }>(),
  gitignorePatterns: [],
};

export const createFileTreeSlice: StateCreator<FileTreeSlice> = (set, get) => ({
  ...initialState,

  setNodes: (nodes: FileNode[]) => {
    // Build extensions map
    const extensionsMap = new Map<string, { count: number; selected: boolean }>();
    const NO_EXT_KEY = '(no extension)';

    nodes.forEach((node) => {
      if (node.type === 'blob') {
        const ext = getFileExtension(node.path) || NO_EXT_KEY;
        const current = extensionsMap.get(ext) || { count: 0, selected: false };
        extensionsMap.set(ext, {
          count: current.count + 1,
          selected: ext === NO_EXT_KEY ? true : CODE_EXTENSIONS.includes(ext),
        });
      }
    });

    // Auto-select files with code extensions and files without extensions
    const selectedPaths = new Set<string>();
    nodes.forEach((node) => {
      if (node.type === 'blob') {
        const ext = getFileExtension(node.path) || NO_EXT_KEY;
        if (extensionsMap.get(ext)?.selected) {
          selectedPaths.add(node.path);
        }
      }
    });

    set({ nodes, extensions: extensionsMap, selectedPaths });
  },

  setTree: (tree: TreeNode[]) => set({ tree }),

  toggleSelection: (path: string) => {
    const { selectedPaths, nodes, excludedPaths } = get();
    const node = nodes.find((n) => n.path === path);
    if (!node) return;

    const newSelected = new Set(selectedPaths);

    if (node.type === 'tree') {
      // Toggle directory: select/deselect all non-excluded children
      const isCurrentlySelected = get().getDirectorySelectionState(path) === 'checked';
      const shouldSelect = !isCurrentlySelected;

      nodes.forEach((n) => {
        if (n.type === 'blob' &&
            (n.path === path || n.path.startsWith(path + '/')) &&
            !excludedPaths.has(n.path)) {
          if (shouldSelect) {
            newSelected.add(n.path);
          } else {
            newSelected.delete(n.path);
          }
        }
      });
    } else {
      // Toggle single file (only if not excluded)
      if (!excludedPaths.has(path)) {
        if (newSelected.has(path)) {
          newSelected.delete(path);
        } else {
          newSelected.add(path);
        }
      }
    }

    set({ selectedPaths: newSelected });
    get().updateExtensionStates();
  },

  selectNode: (path: string) => {
    const { selectedPaths } = get();
    const newSelected = new Set(selectedPaths);
    newSelected.add(path);
    set({ selectedPaths: newSelected });
  },

  deselectNode: (path: string) => {
    const { selectedPaths } = get();
    const newSelected = new Set(selectedPaths);
    newSelected.delete(path);
    set({ selectedPaths: newSelected });
  },

  toggleDirectory: (dirPath: string) => {
    const { nodes, selectedPaths, excludedPaths } = get();
    const state = get().getDirectorySelectionState(dirPath);
    const shouldSelect = state !== 'checked';

    const newSelected = new Set(selectedPaths);
    nodes.forEach((node) => {
      // Only affect non-excluded files
      if (node.type === 'blob' &&
          (node.path === dirPath || node.path.startsWith(dirPath + '/')) &&
          !excludedPaths.has(node.path)) {
        if (shouldSelect) {
          newSelected.add(node.path);
        } else {
          newSelected.delete(node.path);
        }
      }
    });

    set({ selectedPaths: newSelected });
    get().updateExtensionStates();
  },

  toggleExtension: (extension: string) => {
    const { nodes, extensions, selectedPaths, excludedPaths } = get();
    const ext = extensions.get(extension);
    if (!ext) return;

    const NO_EXT_KEY = '(no extension)';
    const shouldSelect = !ext.selected;
    const newExtensions = new Map(extensions);
    newExtensions.set(extension, { ...ext, selected: shouldSelect });

    const newSelected = new Set(selectedPaths);
    nodes.forEach((node) => {
      // Only affect non-excluded files
      if (node.type === 'blob' && !excludedPaths.has(node.path)) {
        const fileExt = getFileExtension(node.path) || NO_EXT_KEY;
        if (fileExt === extension) {
          if (shouldSelect) {
            newSelected.add(node.path);
          } else {
            newSelected.delete(node.path);
          }
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

  setGitignorePatterns: (patterns: string[]) => {
    set({ gitignorePatterns: patterns });
    get().applyGitignore();
  },

  applyGitignore: () => {
    const { nodes, gitignorePatterns } = get();
    const excludedPaths = new Set<string>();

    if (gitignorePatterns.length === 0) {
      set({ excludedPaths });
      return;
    }

    // Convert patterns to regex with negation info
    const patterns = gitignorePatterns
      .map((pattern) => patternToRegex(pattern))
      .filter((r) => r !== null) as PatternResult[];

    // Separate normal patterns from negation patterns
    const normalPatterns = patterns.filter((p) => !p.isNegation);
    const negationPatterns = patterns.filter((p) => p.isNegation);

    // First, apply normal patterns to exclude paths
    nodes.forEach((node) => {
      const isExcluded = normalPatterns.some((p) => p.regex.test(node.path));
      if (isExcluded) {
        excludedPaths.add(node.path);
      }
    });

    // Then, apply negation patterns to un-exclude paths
    nodes.forEach((node) => {
      if (excludedPaths.has(node.path)) {
        const shouldInclude = negationPatterns.some((p) => p.regex.test(node.path));
        if (shouldInclude) {
          excludedPaths.delete(node.path);
        }
      }
    });

    set({ excludedPaths });
  },

  getSelectedNodes: () => {
    const { nodes, selectedPaths, excludedPaths } = get();
    return nodes.filter((node) =>
      node.type === 'blob' &&
      selectedPaths.has(node.path) &&
      !excludedPaths.has(node.path)
    );
  },

  getDirectorySelectionState: (dirPath: string) => {
    const { nodes, selectedPaths, excludedPaths } = get();
    // Only count non-excluded children
    const children = nodes.filter((n) =>
      n.type === 'blob' &&
      (n.path === dirPath || n.path.startsWith(dirPath + '/')) &&
      !excludedPaths.has(n.path)
    );

    if (children.length === 0) return 'unchecked';

    const selectedCount = children.filter((n) => selectedPaths.has(n.path)).length;

    if (selectedCount === 0) return 'unchecked';
    if (selectedCount === children.length) return 'checked';
    return 'indeterminate';
  },

  getExtensionSelectionState: (extension: string) => {
    const { nodes, selectedPaths, excludedPaths } = get();
    const NO_EXT_KEY = '(no extension)';
    // Only count non-excluded files
    const filesWithExt = nodes.filter((n) => {
      if (n.type !== 'blob') return false;
      if (excludedPaths.has(n.path)) return false;
      const fileExt = getFileExtension(n.path) || NO_EXT_KEY;
      return fileExt === extension;
    });

    if (filesWithExt.length === 0) return 'unchecked';

    const selectedCount = filesWithExt.filter((n) => selectedPaths.has(n.path)).length;

    if (selectedCount === 0) return 'unchecked';
    if (selectedCount === filesWithExt.length) return 'checked';
    return 'indeterminate';
  },

  updateExtensionStates: () => {
    const { extensions } = get();
    const newExtensions = new Map(extensions);

    newExtensions.forEach((value, key) => {
      const state = get().getExtensionSelectionState(key);
      newExtensions.set(key, {
        ...value,
        selected: state === 'checked' || state === 'indeterminate',
      });
    });

    set({ extensions: newExtensions });
  },

  getGlobalSelectionState: () => {
    const { nodes, selectedPaths, excludedPaths } = get();
    // Only count non-excluded files
    const files = nodes.filter((n) => n.type === 'blob' && !excludedPaths.has(n.path));

    if (files.length === 0) return 'unchecked';

    const selectedCount = files.filter((n) => selectedPaths.has(n.path)).length;

    if (selectedCount === 0) return 'unchecked';
    if (selectedCount === files.length) return 'checked';
    return 'indeterminate';
  },

  selectAll: () => {
    const { nodes, excludedPaths } = get();
    // Only select non-excluded files
    const allFilePaths = nodes
      .filter((n) => n.type === 'blob' && !excludedPaths.has(n.path))
      .map((n) => n.path);

    set({ selectedPaths: new Set(allFilePaths) });
    get().updateExtensionStates();
  },

  deselectAll: () => {
    set({ selectedPaths: new Set() });
    get().updateExtensionStates();
  },

  reset: () => {
    set((state) => ({
      ...state,
      nodes: [],
      tree: [],
      selectedPaths: new Set<string>(),
      expandedPaths: new Set<string>(),
      excludedPaths: new Set<string>(),
      extensions: new Map<string, { count: number; selected: boolean }>(),
      gitignorePatterns: [],
    }));
  },
});

// Helper functions
function getFileExtension(path: string): string | null {
  const parts = path.split('.');
  if (parts.length > 1) {
    return '.' + parts[parts.length - 1];
  }
  return null;
}

interface PatternResult {
  regex: RegExp;
  isNegation: boolean;
}

function patternToRegex(pattern: string): PatternResult | null {
  // Remove leading/trailing whitespace
  pattern = pattern.trim();

  // Skip empty lines and full-line comments
  if (!pattern || pattern.startsWith('#')) {
    return null;
  }

  // Handle inline comments (remove everything after unescaped #)
  // Look for # that's not preceded by backslash
  const inlineCommentMatch = pattern.match(/(?<!\\)#/);
  if (inlineCommentMatch) {
    pattern = pattern.substring(0, inlineCommentMatch.index).trim();
    if (!pattern) return null;
  }

  // Check for negation pattern (starts with !)
  const isNegation = pattern.startsWith('!');
  if (isNegation) {
    pattern = pattern.substring(1); // Remove the leading !
    if (!pattern) return null;
  }

  // Remove escaped # (replace \# with #)
  pattern = pattern.replace(/\\#/g, '#');

  const isDirectory = pattern.endsWith('/');
  if (isDirectory) {
    pattern = pattern.slice(0, -1); // Remove trailing slash
  }

  // Convert gitignore pattern to regex
  let regexPattern = '';
  let i = 0;

  while (i < pattern.length) {
    const char = pattern[i];
    const nextChar = pattern[i + 1];

    if (char === '*' && nextChar === '*') {
      // Double asterisk: match zero or more directories
      const afterNext = pattern[i + 2];
      if (afterNext === '/') {
        // **/ means zero or more directories
        regexPattern += '(?:.*/)?' ;
        i += 3; // Skip **, /
        continue;
      } else if (i === 0 || pattern[i - 1] === '/') {
        // ** at start or after / means match everything
        regexPattern += '.*';
        i += 2;
        continue;
      }
    }

    if (char === '*') {
      // Single asterisk: match anything except /
      regexPattern += '[^/]*';
      i++;
      continue;
    }

    if (char === '?') {
      // Question mark: match any single character except /
      regexPattern += '[^/]';
      i++;
      continue;
    }

    if (char === '[') {
      // Character class: find closing ]
      const closeIdx = pattern.indexOf(']', i + 1);
      if (closeIdx !== -1) {
        // Extract character class and escape special regex chars inside
        let charClass = pattern.substring(i + 1, closeIdx);
        // Escape backslash and other special chars in character class
        charClass = charClass.replace(/\\/g, '\\\\');
        regexPattern += '[' + charClass + ']';
        i = closeIdx + 1;
        continue;
      }
    }

    // Escape special regex characters
    if ('.+^${}()|\\'.includes(char)) {
      regexPattern += '\\' + char;
    } else {
      regexPattern += char;
    }

    i++;
  }

  // Handle root-level patterns (starting with /)
  if (pattern.startsWith('/')) {
    regexPattern = '^' + regexPattern.substring(1); // Remove leading /
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
    return {
      regex: new RegExp(regexPattern),
      isNegation,
    };
  } catch {
    // Invalid pattern
    return null;
  }
}
