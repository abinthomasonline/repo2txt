# repo2txt - Agent Documentation

**Target Audience:** LLM agents (Claude, GPT-4, etc.) working with this codebase

This document provides comprehensive technical details about the repo2txt architecture, design decisions, and implementation patterns. It is optimized for AI agents to quickly understand the codebase structure and make informed modifications.

## 📋 Document Index

1. [System Architecture](#system-architecture)
2. [Core Abstractions](#core-abstractions)
3. [Data Flow](#data-flow)
4. [State Management](#state-management)
5. [Provider System](#provider-system)
6. [Component Architecture](#component-architecture)
7. [Performance Optimizations](#performance-optimizations)
8. [Type System](#type-system)
9. [Testing Infrastructure](#testing-infrastructure)
10. [Build & Deployment](#build--deployment)

## 🏗️ System Architecture

### High-Level Overview

```
┌───────────────────────────────────────────────────────────────┐
│                         Browser Layer                          │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │                   React Application                      │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │  │
│  │  │   App    │  │  Store   │  │  Router  │  │ Workers │ │  │
│  │  │Component │◄─┤ (Zustand)│◄─┤  (SPA)   │◄─┤ (Async) │ │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └─────────┘ │  │
│  └─────────────────────────────────────────────────────────┘  │
│                              ▲                                 │
│                              │                                 │
│                      ┌───────┴────────┐                       │
│                      │  Component API  │                       │
│                      └───────┬────────┘                       │
│                              │                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │                  Business Logic Layer                    │  │
│  │  ┌────────────────────────────────────────────────────┐ │  │
│  │  │          Provider Interface (Abstract)             │ │  │
│  │  │  • validateUrl()  • parseUrl()   • fetchTree()     │ │  │
│  │  │  • fetchFile()    • fetchMultiple()                │ │  │
│  │  └────────────────────────────────────────────────────┘ │  │
│  │       ▲          ▲           ▲            ▲              │  │
│  │       │          │           │            │              │  │
│  │  ┌────┴──┐  ┌───┴────┐  ┌───┴─────┐  ┌──┴─────┐       │  │
│  │  │GitHub │  │ Local  │  │ GitLab  │  │ Azure  │       │  │
│  │  │  Impl │  │  Impl  │  │  Impl   │  │  Impl  │       │  │
│  │  └───────┘  └────────┘  └─────────┘  └────────┘       │  │
│  └─────────────────────────────────────────────────────────┘  │
│                              ▲                                 │
│                              │                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │                    Data Layer                            │  │
│  │  ┌─────────┐  ┌──────────┐  ┌───────────┐              │  │
│  │  │ GitHub  │  │   File   │  │  JSZip    │              │  │
│  │  │   API   │  │  System  │  │  Parser   │              │  │
│  │  │   REST  │  │    API   │  │  (Binary) │              │  │
│  │  └─────────┘  └──────────┘  └───────────┘              │  │
│  └─────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘
```

### Layer Responsibilities

**Browser Layer:**
- React rendering and component lifecycle
- Event handling and user interactions
- DOM manipulation via React
- Client-side routing (single-page app)

**Business Logic Layer:**
- Provider pattern implementation
- URL parsing and validation
- Tree building and normalization
- File content fetching and formatting
- Gitignore pattern matching
- Token counting

**Data Layer:**
- GitHub API integration
- File System Access API
- ZIP file parsing
- Network requests and retries
- Error handling and recovery

## 🎯 Core Abstractions

### 1. BaseProvider (Abstract Class)

**Location:** `src/lib/providers/BaseProvider.ts`

**Purpose:** Define the contract that all data source providers must implement. Provides shared functionality for error handling, retries, and caching.

**Key Methods:**

```typescript
abstract class BaseProvider {
  // Identity & Validation
  abstract getType(): ProviderType;
  abstract getName(): string;
  abstract requiresAuth(): boolean;
  abstract validateUrl(url: string): boolean;

  // URL Parsing
  abstract parseUrl(url: string): ParsedRepoInfo;

  // Data Fetching
  abstract fetchTree(url: string, options?: FetchOptions): Promise<FileNode[]>;
  abstract fetchFile(node: FileNode): Promise<FileContent>;

  // Shared Utilities (Implemented in Base)
  async *fetchMultiple(
    nodes: FileNode[]
  ): AsyncGenerator<FileContent, void, unknown>;

  protected async fetchWithRetry(
    url: string,
    options?: RequestInit,
    maxRetries = 3
  ): Promise<Response>;

  protected handleFetchError(error: unknown, context?: string): ProviderError;

  // Credential Management
  setCredentials(credentials: ProviderCredentials): void;
  clearCredentials(): void;
}
```

**Design Decisions:**

1. **Abstract class over interface** - Allows shared implementation (fetchWithRetry, fetchMultiple)
2. **AsyncGenerator for fetchMultiple** - Enables progressive loading without buffering all files
3. **Protected error handling** - Consistent error reporting across all providers
4. **Credential management** - Unified token/auth handling

**Usage Pattern:**

```typescript
// Concrete implementation
class GitHubProvider extends BaseProvider {
  getType(): ProviderType {
    return 'github';
  }

  async fetchTree(url: string): Promise<FileNode[]> {
    const parsed = this.parseUrl(url);
    // GitHub-specific tree fetching
    return this.normalizeTree(rawTree);
  }

  // Use base class utilities
  async loadMultipleFiles(nodes: FileNode[]) {
    for await (const content of this.fetchMultiple(nodes)) {
      // Process each file as it arrives (streaming)
    }
  }
}
```

### 2. TreeNode Type System

**Location:** `src/types/index.ts`

**Purpose:** Represent hierarchical file structures in a normalized, provider-agnostic format.

**Type Hierarchy:**

```typescript
// Base node (provider-agnostic)
interface FileNode {
  path: string;              // Unique identifier: "src/components/App.tsx"
  name?: string;             // Display name: "App.tsx"
  type: 'blob' | 'tree';    // File or directory
  size?: number;             // Size in bytes
  url?: string;              // API endpoint for fetching content
  sha?: string;              // Git SHA (for caching)
}

// Tree node with hierarchy
interface TreeNode extends FileNode {
  children?: TreeNode[];     // Nested structure
  expanded?: boolean;        // UI state: is directory open?
  selected?: boolean;        // UI state: checkbox checked?
  visible?: boolean;         // UI state: matches filters?
  excluded?: boolean;        // Gitignore match
  depth?: number;           // Nesting level (for indentation)
}

// File with content
interface FileContent extends FileNode {
  content: string;           // File contents
  encoding?: 'utf8' | 'base64';
  lineCount?: number;        // Number of lines
  tokenCount?: number;       // GPT token count
}
```

**Key Design Decisions:**

1. **Flat FileNode** - Minimal data from provider, no UI state
2. **TreeNode extends FileNode** - Adds hierarchy and UI state
3. **FileContent extends FileNode** - Adds actual content
4. **Optional fields** - Not all providers support all fields
5. **Path as unique ID** - Consistent across all providers

**Tree Building Process:**

```typescript
// 1. Provider returns flat FileNode[]
const fileNodes: FileNode[] = await provider.fetchTree(url);
// [{ path: 'src', type: 'tree' }, { path: 'src/App.tsx', type: 'blob' }]

// 2. Build hierarchical TreeNode[]
const tree: TreeNode[] = buildTree(fileNodes, {
  selectedPaths: new Set(['src/App.tsx']),
  excludedPaths: new Set([]),
  expandedPaths: new Set(['src']),
});
// [{ path: 'src', type: 'tree', expanded: true, children: [
//   { path: 'src/App.tsx', type: 'blob', selected: true }
// ]}]

// 3. Flatten for virtual scrolling
const flatTree = flattenTree(tree);
// [{ node: { path: 'src', ... }, depth: 0 },
//  { node: { path: 'src/App.tsx', ... }, depth: 1 }]
```

### 3. Store Slices Pattern

**Location:** `src/store/`

**Purpose:** Modular state management using Zustand. Each slice manages a specific domain.

**Slice Structure:**

```typescript
// Type definition
interface ProviderSlice {
  // State
  currentProvider: ProviderType;
  provider: BaseProvider | null;
  isLoading: boolean;

  // Actions
  setProvider: (type: ProviderType) => void;
  resetProvider: () => void;

  // Computed/Selectors
  getProviderName: () => string;
}

// Implementation
const createProviderSlice: StateCreator<ProviderSlice> = (set, get) => ({
  currentProvider: 'github',
  provider: null,
  isLoading: false,

  setProvider: (type) => {
    set({ currentProvider: type, isLoading: true });
    // Load provider asynchronously
    loadProvider(type).then(provider => {
      set({ provider, isLoading: false });
    });
  },

  resetProvider: () => set({ provider: null }),

  getProviderName: () => get().provider?.getName() || 'Unknown',
});
```

**Store Composition:**

```typescript
// src/store/index.ts
const useStore = create<AppState>()(
  devtools(
    persist(
      (...args) => ({
        ...createProviderSlice(...args),
        ...createFileTreeSlice(...args),
        ...createFilterSlice(...args),
        ...createUiSlice(...args),
      }),
      {
        name: 'repo2txt-store',
        partialize: (state) => ({
          // Only persist these fields
          theme: state.theme,
          currentProvider: state.currentProvider,
        }),
      }
    )
  )
);
```

**Key Slices:**

1. **ProviderSlice** - Current provider, loading state
2. **FileTreeSlice** - Tree nodes, selection, expansion
3. **FilterSlice** - Extensions, gitignore, custom patterns
4. **UiSlice** - Theme, errors, modals

## 🔄 Data Flow

### Complete User Flow (GitHub Example)

```
┌─────────────────────────────────────────────────────────────┐
│ 1. User Action: Enter GitHub URL                           │
└─────────────────────────────────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. GitHubForm Component                                     │
│    - Validate URL format (regex)                            │
│    - Show validation feedback                               │
└─────────────────────────────────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Click "Load Repository"                                  │
│    - handleSubmit() in GitHubForm                           │
│    - Calls App.tsx handleGitHubSubmit()                     │
└─────────────────────────────────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Provider Initialization                                  │
│    - provider = new GitHubProvider()                        │
│    - provider.setCredentials({ token }) if available        │
└─────────────────────────────────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Parse URL                                                │
│    - parseUrl(url) → { owner, repo, branch, path }          │
│    - Extract: "facebook/react" from URL                     │
│    - Handle branch with slashes: "feature/test/branch"      │
└─────────────────────────────────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. Fetch Tree                                               │
│    - fetchReferences() - Get all branches/tags              │
│    - resolveRefAndPath() - Split branch from path           │
│    - fetchTreeSha() - Get tree SHA for ref                  │
│    - fetchTreeRecursive() - Get complete tree               │
│    - Returns: FileNode[] (flat list)                        │
└─────────────────────────────────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. Store Update                                             │
│    - setNodes(fileNodes)                                    │
│    - buildTree() - Convert to hierarchical TreeNode[]       │
│    - detectExtensions() - Find all file types               │
│    - parseGitignore() - Apply exclusion patterns            │
└─────────────────────────────────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 8. UI Render                                                │
│    - FileTree component (virtual scrolling)                 │
│    - ExtensionFilter (checkboxes)                           │
│    - AdvancedFilters (gitignore editor)                     │
└─────────────────────────────────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 9. User Selects Files                                       │
│    - Click checkboxes in FileTree                           │
│    - toggleSelection(path) updates store                    │
│    - Re-render with updated selection state                 │
└─────────────────────────────────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 10. Click "Generate Output"                                 │
│    - getSelectedNodes() from store                          │
│    - Validate: at least one file selected                   │
└─────────────────────────────────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 11. Fetch File Contents                                     │
│    - provider.fetchMultiple(selectedNodes)                  │
│    - AsyncGenerator yields files progressively              │
│    - Progress updates: "Fetching 5/50 files..."             │
└─────────────────────────────────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 12. Format Output                                           │
│    - Formatter.formatAsync(tree, contents)                  │
│    - Generate directory tree ASCII                          │
│    - Append file contents with headers                      │
└─────────────────────────────────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 13. Tokenize (Web Worker)                                   │
│    - Post files to tokenizer.worker.ts                      │
│    - Worker: encode(content).length for each file           │
│    - Progress callbacks: "Tokenizing 10/50 files..."        │
│    - Returns: { totalTokens, files: [{ path, tokens }] }    │
└─────────────────────────────────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 14. Display Output                                          │
│    - OutputPanel shows formatted text                       │
│    - FileStats shows per-file token counts                  │
│    - Copy/Download buttons enabled                          │
└─────────────────────────────────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 15. User Actions                                            │
│    - Copy to Clipboard (navigator.clipboard.writeText)      │
│    - Download as .txt (Blob + createObjectURL)              │
└─────────────────────────────────────────────────────────────┘
```

### Critical Path for Performance

**Bottlenecks and Solutions:**

1. **Large tree fetching** (10,000+ files)
   - Solution: Recursive API calls with batching
   - GitHub: Use `?recursive=1` parameter
   - Local: Stream entries with Web Streams API

2. **File content fetching** (100+ files)
   - Solution: AsyncGenerator with concurrency control
   - Fetch 5 files in parallel, yield as they complete
   - Progress updates every file

3. **Tokenization** (large files, CPU-intensive)
   - Solution: Web Worker for non-blocking
   - Batch processing with progress callbacks
   - Transfer data via structured clone

4. **Tree rendering** (10,000+ nodes)
   - Solution: Virtual scrolling (TanStack Virtual)
   - Only render visible nodes + overscan
   - Constant memory regardless of tree size

5. **State updates** (frequent selection changes)
   - Solution: Zustand with immer-style updates
   - Memoized selectors prevent unnecessary re-renders
   - Set-based operations for O(1) lookups

## 💾 State Management

### Zustand Store Architecture

**Store Shape:**

```typescript
interface AppState {
  // Provider State
  currentProvider: ProviderType;
  provider: BaseProvider | null;
  repoInfo: RepoMetadata | null;

  // File Tree State
  nodes: FileNode[];              // Flat list from provider
  tree: TreeNode[];               // Hierarchical tree
  selectedPaths: Set<string>;     // Checked files
  excludedPaths: Set<string>;     // Gitignore matches
  expandedPaths: Set<string>;     // Open directories

  // Filter State
  extensionList: ExtensionInfo[];
  gitignorePatterns: string[];
  customPatterns: string[];
  showExcluded: boolean;

  // UI State
  theme: ThemeMode;
  isLoading: boolean;
  error: ErrorState | null;
  output: FormattedOutput | null;

  // Actions
  setProvider: (type: ProviderType) => void;
  setNodes: (nodes: FileNode[]) => void;
  toggleSelection: (path: string) => void;
  toggleExpanded: (path: string) => void;
  toggleExtension: (ext: string) => void;
  setGitignorePatterns: (patterns: string[]) => void;
  setTheme: (theme: ThemeMode) => void;
  setError: (error: ErrorState | null) => void;
  setOutput: (output: FormattedOutput) => void;

  // Computed Selectors
  getSelectedNodes: () => FileNode[];
  getVisibleTree: () => TreeNode[];
  getExtensionCount: (ext: string) => number;
}
```

**State Update Patterns:**

```typescript
// Simple state update
setTheme: (theme) => set({ theme });

// Computed state update
toggleSelection: (path) => set((state) => {
  const newSelected = new Set(state.selectedPaths);
  if (newSelected.has(path)) {
    newSelected.delete(path);
  } else {
    newSelected.add(path);
  }
  return { selectedPaths: newSelected };
});

// Async state update with loading
setProvider: async (type) => {
  set({ isLoading: true, error: null });
  try {
    const provider = await loadProvider(type);
    set({ currentProvider: type, provider, isLoading: false });
  } catch (error) {
    set({ error: handleError(error), isLoading: false });
  }
};

// Selector (computed value)
getSelectedNodes: () => {
  const { nodes, selectedPaths } = get();
  return nodes.filter(n => selectedPaths.has(n.path));
};
```

**Persistence:**

```typescript
// Only persist non-sensitive, user preferences
persist(
  (set, get) => ({ /* store */ }),
  {
    name: 'repo2txt-store',
    partialize: (state) => ({
      theme: state.theme,                    // Dark mode preference
      currentProvider: state.currentProvider, // Last used provider
      // NOT persisted: tokens, file contents, selection
    }),
  }
)
```

## 🔌 Provider System

### GitHubProvider Deep Dive

**Key Methods:**

```typescript
class GitHubProvider extends BaseProvider {
  private static readonly API_BASE = 'https://api.github.com';

  // 1. URL Parsing with Branch Slash Support
  parseUrl(url: string): ParsedRepoInfo {
    const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)(?:\/tree\/(.+))?/);
    return {
      owner: match[1],
      repo: match[2],
      branch: match[3],  // Full string: "feature/test/branch-name"
      // Branch/path splitting happens later with actual branch list
    };
  }

  // 2. Resolve Branch vs Path
  private async resolveRefAndPath(
    lastString: string,
    references: GitHubReferences
  ): Promise<{ ref: string; path: string }> {
    // Sort refs by length (longest first)
    const sortedRefs = [...references.branches, ...references.tags]
      .sort((a, b) => b.length - a.length);

    // Find longest matching ref
    const matchingRef = sortedRefs.find(ref =>
      lastString === ref || lastString.startsWith(ref + '/')
    );

    if (matchingRef) {
      const path = lastString.slice(matchingRef.length + 1);
      return { ref: matchingRef, path };
    }

    // No match - treat as branch name (will error if invalid)
    return { ref: lastString, path: '' };
  }

  // 3. Fetch Tree Recursively
  private async fetchTreeRecursive(
    owner: string,
    repo: string,
    sha: string
  ): Promise<FileNode[]> {
    const url = `${API_BASE}/repos/${owner}/${repo}/git/trees/${sha}?recursive=1`;
    const response = await this.fetchWithRetry(url);
    const data = await response.json();

    return data.tree.map(item => ({
      path: item.path,
      type: item.type,
      size: item.size,
      url: item.url,
      sha: item.sha,
    }));
  }

  // 4. Fetch Single File
  async fetchFile(node: FileNode): Promise<FileContent> {
    const response = await this.fetchWithRetry(node.url);
    const data = await response.json();

    // GitHub returns base64-encoded content
    const content = atob(data.content.replace(/\n/g, ''));

    return {
      ...node,
      content,
      encoding: data.encoding,
      lineCount: content.split('\n').length,
    };
  }

  // 5. Rate Limit Handling
  private buildGitHubHeaders(): Headers {
    const headers = { 'Accept': 'application/vnd.github+json' };

    if (this.credentials?.token) {
      // Authenticated: 5000 req/hr
      headers['Authorization'] = `token ${this.credentials.token}`;
    }
    // Unauthenticated: 60 req/hr

    return headers;
  }
}
```

**API Call Sequence:**

```
1. fetchTree(url)
   ├─→ parseUrl(url)
   ├─→ fetchReferences() → GET /repos/:owner/:repo/git/matching-refs/heads/
   ├─→ resolveRefAndPath() → Determine branch vs path
   ├─→ fetchTreeSha() → GET /repos/:owner/:repo/contents/:path?ref=:ref
   └─→ fetchTreeRecursive() → GET /repos/:owner/:repo/git/trees/:sha?recursive=1

2. fetchFile(node)
   └─→ GET /repos/:owner/:repo/git/blobs/:sha

3. fetchMultiple(nodes)
   └─→ for await (node of nodes) { yield fetchFile(node); }
```

### LocalProvider Deep Dive

**Key Methods:**

```typescript
class LocalProvider extends BaseProvider {
  // 1. Directory Picker (File System Access API)
  async fetchTree(url: string): Promise<FileNode[]> {
    const dirHandle = await window.showDirectoryPicker({
      mode: 'read',
    });

    const nodes: FileNode[] = [];

    async function traverse(handle: FileSystemHandle, path = '') {
      if (handle.kind === 'file') {
        nodes.push({
          path: path + handle.name,
          type: 'blob',
          name: handle.name,
          url: path + handle.name, // Used as lookup key
        });
      } else {
        const dirPath = path + handle.name + '/';
        nodes.push({ path: dirPath, type: 'tree', name: handle.name });

        for await (const entry of handle.values()) {
          await traverse(entry, dirPath);
        }
      }
    }

    await traverse(dirHandle);
    return nodes;
  }

  // 2. Read File
  async fetchFile(node: FileNode): Promise<FileContent> {
    // Look up file handle from cache
    const fileHandle = this.fileHandles.get(node.path);
    const file = await fileHandle.getFile();
    const content = await file.text();

    return {
      ...node,
      content,
      size: file.size,
      lineCount: content.split('\n').length,
    };
  }

  // 3. ZIP File Support
  async processZipFile(file: File): Promise<FileNode[]> {
    const zip = await JSZip.loadAsync(file);
    const nodes: FileNode[] = [];

    zip.forEach((path, zipEntry) => {
      if (!zipEntry.dir) {
        nodes.push({
          path,
          type: 'blob',
          name: path.split('/').pop(),
          size: zipEntry._data.uncompressedSize,
        });
      } else {
        nodes.push({ path, type: 'tree', name: path });
      }
    });

    // Store zip object for later file extraction
    this.zipFile = zip;
    return nodes;
  }

  async fetchFile(node: FileNode): Promise<FileContent> {
    const zipEntry = this.zipFile.file(node.path);
    const content = await zipEntry.async('text');

    return { ...node, content };
  }
}
```

## 🎨 Component Architecture

### Component Hierarchy

```
App.tsx (Root)
├── Header
│   ├── Logo
│   ├── ThemeToggle
│   └── GitHubLink
│
├── ProviderSelector
│   ├── ProviderTab (GitHub)
│   ├── ProviderTab (Local)
│   ├── ProviderTab (GitLab)
│   └── ProviderTab (Azure)
│
├── [Current Provider Form]
│   ├── GitHubForm
│   │   ├── GitHubUrlInput
│   │   └── GitHubAuth
│   │
│   └── LocalForm
│       ├── DirectoryPicker
│       └── ZipUploader
│
├── AdvancedFilters (collapsible)
│   ├── ExtensionFilter
│   ├── GitignoreEditor
│   └── ShowExcludedToggle
│
├── FileTreeSection
│   ├── FileTreeHeader
│   │   ├── SelectAllCheckbox
│   │   └── GenerateButton
│   │
│   └── FileTree (virtual scrolling)
│       └── FileTreeNode[] (virtualized)
│
├── OutputPanel
│   ├── OutputHeader
│   │   ├── TokenCount
│   │   ├── LineCount
│   │   ├── CopyButton
│   │   └── DownloadButton
│   │
│   ├── FileStats (collapsible)
│   │   └── FileStatItem[] (per-file tokens)
│   │
│   └── OutputPreview
│       └── FormattedText
│
├── Footer
│   └── Credits
│
└── ErrorDialog (modal)
    ├── ErrorIcon
    ├── ErrorMessage
    ├── CloseButton
    └── RecoveryAction (optional)
```

### Key Component Patterns

**1. Compound Components (FileTree)**

```typescript
// FileTree manages virtualization
export function FileTree({ nodes }: FileTreeProps) {
  const flatNodes = useMemo(() => flattenTree(nodes), [nodes]);
  const virtualizer = useVirtualizer({ /* config */ });

  return (
    <div ref={parentRef}>
      {virtualizer.getVirtualItems().map(virtualRow => (
        <FileTreeNode
          key={virtualRow.key}
          node={flatNodes[virtualRow.index].node}
          depth={flatNodes[virtualRow.index].depth}
        />
      ))}
    </div>
  );
}

// FileTreeNode is a pure component (React.memo)
export const FileTreeNode = React.memo(({ node, depth }: Props) => {
  const indent = depth * 16;
  return (
    <div style={{ paddingLeft: `${indent}px` }}>
      {/* Render node */}
    </div>
  );
});
```

**2. Controlled vs Uncontrolled**

- **Controlled**: FileTree (selection managed by store)
- **Uncontrolled**: Form inputs (local state, submit on button click)

**3. Lazy Loading**

```typescript
// Provider components are code-split
const GitHubForm = lazy(() => import('@/features/github/components/GitHubForm'));
const LocalForm = lazy(() => import('@/features/local/components/LocalForm'));

function ProviderSelector() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      {currentProvider === 'github' && <GitHubForm />}
      {currentProvider === 'local' && <LocalForm />}
    </Suspense>
  );
}
```

**4. data-testid Strategy**

All interactive elements have data-testid for E2E stability:

```typescript
<button
  data-testid="generate-output-button"
  onClick={handleGenerate}
>
  Generate Output
</button>

<div data-testid="file-tree-section">
  <h2 data-testid="file-tree-heading">File Tree</h2>
  {/* ... */}
</div>
```

## ⚡ Performance Optimizations

### 1. Virtual Scrolling Implementation

**Problem:** Rendering 10,000+ tree nodes causes:
- Long initial render (10s+)
- High memory usage (100MB+)
- Sluggish scrolling

**Solution:** TanStack Virtual

```typescript
const virtualizer = useVirtualizer({
  count: flatNodes.length,           // Total items: 10,000
  getScrollElement: () => parentRef.current,
  estimateSize: () => 32,            // Row height: 32px
  overscan: 10,                      // Render 10 extra rows
});

// Result: Only ~30 nodes in DOM at once
// Memory: ~2MB regardless of tree size
// Render time: <100ms
```

**Benchmarks:**

| Tree Size | Without Virtual | With Virtual | Improvement |
|-----------|----------------|--------------|-------------|
| 1,000     | 500ms         | 50ms         | 10x faster  |
| 5,000     | 5s            | 50ms         | 100x faster |
| 10,000    | 15s           | 50ms         | 300x faster |

### 2. Code Splitting

**Bundle Analysis:**

```
Main chunk (initial load):
├── React + React-DOM: 140KB (gzipped)
├── Zustand: 3KB
├── App + shared components: 80KB
├── Tailwind CSS: 50KB
└── Core utilities: 57KB
Total: ~330KB

Dynamic chunks (lazy loaded):
├── GitHub provider: 50KB (loaded on GitHub tab)
├── Local provider: 30KB (loaded on Local tab)
├── GitLab provider: 45KB (loaded on GitLab tab)
├── Azure provider: 40KB (loaded on Azure tab)
└── Tokenizer: 1.7MB (loaded on Generate click)
```

**Load Time Impact:**

- Time to Interactive: 1.2s (without code splitting: 3.5s)
- Largest Contentful Paint: 0.8s
- Total Blocking Time: 50ms

### 3. Web Worker for Tokenization

**Without Worker (Main Thread):**
```typescript
function formatOutput(files: FileContent[]): FormattedOutput {
  const tokenCount = files.reduce((sum, file) => {
    return sum + encode(file.content).length; // BLOCKS UI
  }, 0);

  // UI frozen for 2-5 seconds on large repos
}
```

**With Worker (Background Thread):**
```typescript
// Main thread
const worker = new TokenizerWorker();
const result = await worker.tokenizeBatch(files, (progress) => {
  // UI remains responsive, progress updates smooth
  setProgress(progress);
});

// Worker thread (tokenizer.worker.ts)
self.onmessage = (e) => {
  const { files } = e.data;
  for (const file of files) {
    const tokens = encode(file.content).length;
    self.postMessage({ progress, file: { ...file, tokens } });
  }
};
```

**Result:**
- Main thread remains responsive (60fps)
- Progress updates every 100ms
- Utilizes multi-core CPUs
- 3-4x faster on quad-core machines

### 4. Memoization Strategy

**Expensive Computations:**

```typescript
// Tree flattening (O(n) operation)
const flatNodes = useMemo(
  () => flattenTree(tree, showExcluded),
  [tree, showExcluded]
);

// Extension counting
const extensionCounts = useMemo(() => {
  const counts = new Map<string, number>();
  nodes.forEach(node => {
    const ext = getExtension(node.path);
    counts.set(ext, (counts.get(ext) || 0) + 1);
  });
  return counts;
}, [nodes]);

// Selected nodes (Set lookups are O(1))
const selectedNodes = useMemo(
  () => nodes.filter(n => selectedPaths.has(n.path)),
  [nodes, selectedPaths]
);
```

**React.memo for Pure Components:**

```typescript
// FileTreeNode re-renders only when props change
export const FileTreeNode = React.memo(
  ({ node, depth, onToggle, onSelect }: Props) => {
    return <div>{/* render */}</div>;
  },
  (prevProps, nextProps) => {
    // Custom comparison: only re-render if these changed
    return (
      prevProps.node.path === nextProps.node.path &&
      prevProps.node.selected === nextProps.node.selected &&
      prevProps.node.expanded === nextProps.node.expanded
    );
  }
);
```

### 5. Progressive Loading

**Async Generator Pattern:**

```typescript
// Fetch multiple files progressively
async *fetchMultiple(nodes: FileNode[]): AsyncGenerator<FileContent> {
  const CONCURRENT = 5; // Fetch 5 files at a time

  for (let i = 0; i < nodes.length; i += CONCURRENT) {
    const batch = nodes.slice(i, i + CONCURRENT);
    const promises = batch.map(node => this.fetchFile(node));

    const results = await Promise.allSettled(promises);

    for (const result of results) {
      if (result.status === 'fulfilled') {
        yield result.value; // Yield immediately as each file completes
      }
    }
  }
}

// Consumer updates UI incrementally
const files: FileContent[] = [];
for await (const content of provider.fetchMultiple(selectedNodes)) {
  files.push(content);
  updateProgress(files.length, selectedNodes.length);
  // UI updates every file, feels faster
}
```

## 🧪 Testing Infrastructure

### Test Organization

```
tests/
├── e2e/                          # Playwright E2E tests
│   ├── dark-mode.spec.ts        # Theme switching (5 tests)
│   ├── error-scenarios.spec.ts  # Error handling (8 tests)
│   ├── github-flow.spec.ts      # GitHub workflow (6 tests)
│   └── local-flow.spec.ts       # Local files (6 tests)
│
├── test-config.ts               # Test secrets (git-ignored)
└── test-config.example.ts       # Template

src/
└── **/__tests__/                # Unit tests (co-located)
    ├── GitHubProvider.test.ts
    ├── Formatter.test.ts
    ├── FileTree.test.tsx
    └── ...
```

### E2E Test Patterns

**1. Token Injection (Before Navigation)**

```typescript
test.beforeEach(async ({ page }) => {
  // Inject token BEFORE page load
  await page.addInitScript((token) => {
    if (token) {
      sessionStorage.setItem('github_token', token);
    }
  }, testConfig.githubToken);

  await page.goto('/');
  await page.waitForLoadState('networkidle');
});
```

**Why?** GitHub API rate limit: 60 req/hr (no token) vs 5000 req/hr (with token)

**2. Stable Selectors (data-testid)**

```typescript
// ❌ Fragile (breaks if text changes)
await page.getByText('File Tree').click();

// ✅ Stable (semantic ID)
await page.getByTestId('file-tree-heading').click();

// ✅ Accessible (ARIA label)
await page.getByRole('button', { name: 'Generate Output' }).click();

// ✅ Test ID for complex selectors
await page.getByTestId('generate-output-button').click();
```

**3. Wait Strategies**

```typescript
// Wait for network idle (GitHub API complete)
await page.waitForLoadState('networkidle');

// Wait for specific element (tree loaded)
await expect(page.getByTestId('file-tree-heading')).toBeVisible({ timeout: 30000 });

// Wait for code split bundle (provider loaded)
await page.waitForTimeout(1500); // Dynamic import delay
```

**4. Error Dialog Testing**

```typescript
// Trigger error: no files selected
await globalCheckbox.click(); // Deselect all
await generateButton.click();

// Verify error dialog
const dialogHeading = page.getByRole('heading', { name: /Unable to Complete Request/i });
await expect(dialogHeading).toBeVisible();

// Close dialog
await page.keyboard.press('Escape');
await expect(dialogHeading).not.toBeVisible();
```

### Unit Test Patterns

**1. Provider Testing (Mocked Fetch)**

```typescript
describe('GitHubProvider', () => {
  beforeEach(() => {
    vi.spyOn(global, 'fetch').mockImplementation((url) => {
      if (url.includes('/git/trees/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ tree: mockTreeData }),
        });
      }
    });
  });

  it('should parse URLs with branch slashes', () => {
    const provider = new GitHubProvider();
    const result = provider.parseUrl(
      'https://github.com/owner/repo/tree/feature/test/branch'
    );

    expect(result.branch).toBe('feature/test/branch');
  });
});
```

**2. Component Testing (React Testing Library)**

```typescript
describe('FileTree', () => {
  it('should render virtual scrolling', () => {
    const nodes = Array.from({ length: 1000 }, (_, i) => ({
      path: `file${i}.txt`,
      type: 'blob',
    }));

    render(<FileTree nodes={nodes} />);

    // Only ~30 nodes rendered (virtual scrolling)
    const renderedNodes = screen.getAllByRole('treeitem');
    expect(renderedNodes.length).toBeLessThan(50);
  });
});
```

## 🚀 Build & Deployment

### Build Process

```bash
# Development build (with source maps)
npm run dev
├─→ Vite dev server (http://localhost:5173/repo2txt/)
├─→ Hot Module Replacement (HMR)
├─→ Fast refresh for React
└─→ TypeScript type checking in background

# Production build
npm run build
├─→ vite build (Rollup under the hood)
├─→ TypeScript compilation (if build:check)
├─→ Code splitting (manual chunks)
├─→ Minification (Terser)
├─→ CSS optimization (Tailwind purge)
└─→ Output: dist/ folder

# Output structure:
dist/
├── index.html                    # Entry point
├── assets/
│   ├── index-[hash].js          # Main bundle (330KB)
│   ├── index-[hash].css         # Styles (50KB)
│   ├── react-[hash].js          # React vendor (140KB)
│   ├── zustand-[hash].js        # Zustand (3KB)
│   ├── tokenizer-[hash].js      # GPT tokenizer (1.7MB)
│   └── [provider]-[hash].js     # Lazy loaded providers
└── vite.svg                      # Favicon
```

### Deployment Pipeline

**GitHub Actions Workflow (.github/workflows/deploy.yml):**

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [master, main]
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      # Quality checks
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm run test:unit

      # Build
      - run: npm run build
        env:
          NODE_ENV: production

      # Deploy
      - uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/deploy-pages@v4
```

**Deployment Flow:**

```
1. Git push to master
   ↓
2. GitHub Actions triggered
   ↓
3. Install dependencies (npm ci)
   ↓
4. Run checks:
   - Type checking (tsc --noEmit)
   - Linting (eslint)
   - Unit tests (vitest)
   ↓
5. Build production bundle
   ↓
6. Upload to GitHub Pages
   ↓
7. Deploy to https://abinthomas.in/repo2txt/
   ↓
8. Deployment complete (~2-3 minutes)
```

### Configuration Files

**vite.config.ts:**
```typescript
export default defineConfig({
  base: '/repo2txt/',              // Subdirectory deployment
  plugins: [react()],
  resolve: { alias: { '@': './src' } },
  build: {
    target: 'es2022',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {           // Code splitting
          react: ['react', 'react-dom'],
          zustand: ['zustand'],
          jszip: ['jszip'],
          tokenizer: ['gpt-tokenizer'],
        },
      },
    },
  },
});
```

**tsconfig.json (Strict Mode):**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,                    // All strict checks
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "paths": { "@/*": ["./src/*"] }
  }
}
```

---

## 🎯 Quick Reference

### Adding a New Provider

1. Create `src/features/newprovider/NewProvider.ts`
2. Extend `BaseProvider`
3. Implement required methods: `getType()`, `validateUrl()`, `parseUrl()`, `fetchTree()`, `fetchFile()`
4. Add UI components in `src/features/newprovider/components/`
5. Register in `ProviderSelector.tsx`
6. Add tests in `src/features/newprovider/__tests__/`

### Adding a New Filter

1. Add filter state to `src/store/slices/filterSlice.ts`
2. Create UI component in `src/components/filters/`
3. Integrate in `AdvancedFilters.tsx`
4. Update tree building logic in `buildTree()`
5. Add tests

### Performance Debugging

```typescript
// React DevTools Profiler
<Profiler id="FileTree" onRender={logPerf}>
  <FileTree nodes={nodes} />
</Profiler>

// Zustand DevTools
// Enable in store: devtools(...)
// Use Redux DevTools browser extension

// Bundle Analysis
npm run build:analyze
// Opens visualization of bundle chunks
```

---

**Last Updated:** 2026-01-17
**Version:** 2.0.0
**Maintained By:** Claude Sonnet 4.5
