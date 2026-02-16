# Contributing to repo2txt

Thank you for your interest in contributing! This document provides comprehensive guidance on the project architecture, design patterns, and development workflow.

## 📋 Table of Contents

- [Getting Started](#getting-started)
- [Architecture Overview](#architecture-overview)
- [Design Patterns](#design-patterns)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Testing Strategy](#testing-strategy)
- [Code Style](#code-style)
- [Pull Request Process](#pull-request-process)

## 🚀 Getting Started

### Prerequisites

- Node.js 20+ (LTS recommended)
- npm 10+
- Git
- A code editor (VS Code recommended)

### Initial Setup

```bash
# Fork the repository on GitHub
# Clone your fork
git clone https://github.com/YOUR_USERNAME/repo2txt.git
cd repo2txt

# Add upstream remote
git remote add upstream https://github.com/abinthomasonline/repo2txt.git

# Install dependencies
npm install

# Copy test configuration template
cp tests/test-config.example.ts tests/test-config.ts
# Add your GitHub token to test-config.ts (optional, for E2E tests)

# Start development server
npm run dev
```

### Development Commands

```bash
# Development
npm run dev              # Start dev server (http://localhost:5173/repo2txt/)
npm run build            # Production build
npm run preview          # Preview production build

# Testing
npm run test:unit        # Run unit tests
npm run test:e2e         # Run E2E tests
npm run test:watch       # Watch mode for unit tests
npm run test:coverage    # Generate coverage report

# Code Quality
npm run typecheck        # TypeScript type checking
npm run lint             # Lint code
npm run lint:fix         # Auto-fix linting issues
npm run format           # Format code with Prettier
npm run format:check     # Check formatting

# CI Pipeline (runs all checks)
npm run ci               # typecheck + lint + test:unit
```

## 🏗️ Architecture Overview

### Core Design Principles

1. **Provider Pattern** - Unified interface for multiple data sources
2. **Separation of Concerns** - Clear boundaries between UI, business logic, and data
3. **Type Safety** - TypeScript everywhere with strict mode
4. **Performance First** - Virtual scrolling, code splitting, Web Workers
5. **Privacy First** - All processing happens in the browser

### System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      React App                          │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │     UI      │  │     Store    │  │   Workers    │  │
│  │ Components  │◄─┤   (Zustand)  │◄─┤ (Tokenizer)  │  │
│  └─────────────┘  └──────────────┘  └──────────────┘  │
│         ▲                 ▲                             │
│         │                 │                             │
│         ▼                 ▼                             │
│  ┌─────────────────────────────────────────────────┐  │
│  │           Provider Interface                    │  │
│  │  (BaseProvider - Abstract Base Class)           │  │
│  └─────────────────────────────────────────────────┘  │
│         ▲         ▲          ▲           ▲             │
│         │         │          │           │             │
│    ┌────┴───┬────┴────┬─────┴─────┬────┴────┐        │
│    │ GitHub │  Local  │  GitLab   │  Azure  │        │
│    │Provider│ Provider│  Provider │Provider │        │
│    └────────┴─────────┴───────────┴─────────┘        │
└─────────────────────────────────────────────────────────┘
```

### Data Flow

```
User Input → URL Parsing → Provider Selection → Tree Fetch
    ↓
File Tree (Virtual Scrolling) → User Selection → Filters
    ↓
Content Fetch → Formatting → Tokenization (Web Worker)
    ↓
Output Display → Copy/Download
```

## 🎨 Design Patterns

### 1. Provider Pattern

**Purpose:** Abstract different data sources (GitHub, Local, GitLab, Azure) behind a unified interface.

**Implementation:**

```typescript
// Base provider interface
abstract class BaseProvider {
  abstract getType(): ProviderType;
  abstract validateUrl(url: string): boolean;
  abstract parseUrl(url: string): ParsedRepoInfo;
  abstract fetchTree(url: string, options?: FetchOptions): Promise<FileNode[]>;
  abstract fetchFile(node: FileNode): Promise<FileContent>;

  // Shared utilities
  async *fetchMultiple(nodes: FileNode[]): AsyncGenerator<FileContent> {
    // Progressive loading implementation
  }
}

// Concrete implementation
class GitHubProvider extends BaseProvider {
  async fetchTree(url: string): Promise<FileNode[]> {
    // GitHub-specific implementation
    const parsed = this.parseUrl(url);
    const tree = await this.fetchGitHubTree(parsed);
    return this.normalizeTree(tree);
  }
}
```

**Benefits:**
- Easy to add new providers (GitLab, Bitbucket, etc.)
- Consistent interface across all sources
- Shared functionality in base class (error handling, retries, caching)
- Type-safe provider switching

### 2. State Management with Zustand

**Purpose:** Centralized, reactive state management without Redux boilerplate.

**Store Structure:**

```typescript
// Modular stores (slices pattern)
interface AppState {
  // UI State
  theme: ThemeMode;
  isLoading: boolean;
  error: ErrorState | null;

  // Data State
  currentProvider: ProviderType;
  tree: FileNode[];
  selectedPaths: Set<string>;
  excludedPaths: Set<string>;

  // Actions
  setProvider: (provider: ProviderType) => void;
  toggleSelection: (path: string) => void;
  // ...more actions
}

// Store composition
const useStore = create<AppState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        theme: 'system',

        // Actions
        setTheme: (theme) => set({ theme }),

        // Computed selectors
        getSelectedNodes: () => {
          const { tree, selectedPaths } = get();
          return tree.filter(n => selectedPaths.has(n.path));
        }
      }),
      { name: 'repo2txt-store' }
    )
  )
);
```

**Benefits:**
- Simple API with hooks
- DevTools integration
- Persistence support
- Computed selectors
- Minimal re-renders

### 3. Virtual Scrolling

**Purpose:** Efficiently render large file trees (10,000+ files) without performance degradation.

**Implementation:**

```typescript
// Using TanStack Virtual
import { useVirtualizer } from '@tanstack/react-virtual';

function FileTree({ nodes }: { nodes: TreeNode[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Flatten tree for virtual scrolling
  const flatNodes = useMemo(() => flattenTree(nodes), [nodes]);

  const virtualizer = useVirtualizer({
    count: flatNodes.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 32, // Row height
    overscan: 10, // Render extra rows outside viewport
  });

  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      <div style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map(virtualRow => (
          <FileTreeNode
            key={virtualRow.key}
            node={flatNodes[virtualRow.index]}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualRow.start}px)`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
```

**Benefits:**
- Constant memory usage regardless of tree size
- Smooth scrolling
- Only renders visible items + overscan
- Automatic height calculation

### 4. Code Splitting with Dynamic Imports

**Purpose:** Reduce initial bundle size by lazy-loading provider implementations.

**Implementation:**

```typescript
// Provider registry with lazy loading
const PROVIDERS = {
  github: () => import('@/features/github/GitHubProvider'),
  local: () => import('@/features/local/LocalProvider'),
  gitlab: () => import('@/features/gitlab/GitLabProvider'),
  azure: () => import('@/features/azure/AzureDevOpsProvider'),
};

// Dynamic provider loading in ProviderSelector
const loadProvider = async (type: ProviderType) => {
  const ProviderModule = await PROVIDERS[type]();
  const ProviderClass = ProviderModule.default;
  return new ProviderClass();
};
```

**Bundle Impact:**
- Main chunk: ~330KB
- GitHub provider: ~50KB (loaded on demand)
- Local provider: ~30KB (loaded on demand)
- Each provider only loads when selected

### 5. Web Worker for Tokenization

**Purpose:** Offload CPU-intensive tokenization to background thread.

**Implementation:**

```typescript
// Worker wrapper
class TokenizerWorker {
  private worker: Worker;

  async tokenize(text: string): Promise<number> {
    return new Promise((resolve) => {
      this.worker.postMessage({ type: 'tokenize', text });
      this.worker.onmessage = (e) => resolve(e.data.tokenCount);
    });
  }

  async tokenizeBatch(
    files: FileContent[],
    onProgress?: (progress: number) => void
  ): Promise<{ totalTokens: number; files: FileWithStats[] }> {
    // Progressive tokenization with progress callbacks
  }
}

// Worker implementation (tokenizer.worker.ts)
self.onmessage = async (event) => {
  const { type, text, files } = event.data;

  if (type === 'tokenize') {
    const tokenCount = encode(text).length;
    self.postMessage({ tokenCount });
  } else if (type === 'tokenize_batch') {
    for (const file of files) {
      const tokenCount = encode(file.content).length;
      self.postMessage({
        type: 'progress',
        file: { ...file, tokenCount }
      });
    }
  }
};
```

**Benefits:**
- Non-blocking UI during tokenization
- Progress updates for long operations
- Better perceived performance
- Utilizes multi-core CPUs

### 6. Error Handling Strategy

**Layered error handling with custom error types:**

```typescript
// Custom error classes
class ProviderError extends Error {
  constructor(
    message: string,
    public code: ErrorCode,
    public userMessage: string,
    public recovery?: () => void
  ) {
    super(message);
  }
}

// Error boundaries in React
class ErrorBoundary extends Component {
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to error tracking service
    console.error('Caught error:', error, errorInfo);
  }
}

// Error dialog for user-facing errors
{error && (
  <ErrorDialog
    title="Unable to Complete Request"
    message={error.message}
    onClose={() => setError(null)}
    onAction={error.recovery}
    actionLabel={error.recoveryLabel}
  />
)}
```

## 📁 Project Structure

```
repo2txt/
├── .github/
│   └── workflows/
│       └── deploy.yml           # GitHub Actions CI/CD
│
├── src/
│   ├── features/                # Feature modules (domain-driven)
│   │   ├── github/
│   │   │   ├── GitHubProvider.ts      # GitHub API implementation
│   │   │   ├── components/            # GitHub-specific UI
│   │   │   │   ├── GitHubAuth.tsx    # Token management
│   │   │   │   ├── GitHubForm.tsx    # URL input form
│   │   │   │   └── GitHubUrlInput.tsx
│   │   │   └── __tests__/            # Feature tests
│   │   │
│   │   ├── local/
│   │   │   ├── LocalProvider.ts       # File System API
│   │   │   └── components/
│   │   │       ├── DirectoryPicker.tsx
│   │   │       ├── ZipUploader.tsx
│   │   │       └── LocalForm.tsx
│   │   │
│   │   ├── gitlab/                    # GitLab provider (beta)
│   │   └── azure/                     # Azure DevOps (beta)
│   │
│   ├── components/              # Shared UI components
│   │   ├── ui/                 # Base components (buttons, dialogs)
│   │   │   ├── Button.tsx
│   │   │   ├── ErrorDialog.tsx
│   │   │   └── ThemeToggle.tsx
│   │   │
│   │   ├── file-tree/          # File tree components
│   │   │   ├── FileTree.tsx           # Virtual scrolling tree
│   │   │   └── FileTreeNode.tsx       # Individual node
│   │   │
│   │   ├── filters/            # Filtering components
│   │   │   ├── AdvancedFilters.tsx
│   │   │   ├── ExtensionFilter.tsx
│   │   │   └── GitignoreEditor.tsx
│   │   │
│   │   ├── OutputPanel.tsx     # Output display & actions
│   │   ├── FileStats.tsx       # Token/line statistics
│   │   └── ProviderSelector.tsx # Provider tabs
│   │
│   ├── lib/                    # Core business logic
│   │   ├── providers/
│   │   │   ├── BaseProvider.ts        # Abstract base class
│   │   │   └── types.ts              # Shared provider types
│   │   │
│   │   ├── formatter/
│   │   │   ├── Formatter.ts          # Output formatting
│   │   │   ├── TokenizerWorker.ts    # Web Worker wrapper
│   │   │   └── __tests__/
│   │   │
│   │   ├── gitignore/
│   │   │   └── GitignoreParser.ts    # .gitignore parsing
│   │   │
│   │   └── utils.ts            # Shared utilities
│   │
│   ├── store/                  # Zustand state management
│   │   ├── index.ts            # Store composition
│   │   └── slices/             # Store slices
│   │       ├── providerSlice.ts      # Provider state
│   │       ├── fileTreeSlice.ts      # File tree state
│   │       ├── filterSlice.ts        # Filter state
│   │       └── uiSlice.ts            # UI state (theme, loading)
│   │
│   ├── hooks/                  # Custom React hooks
│   │   ├── useFileTree.ts
│   │   ├── useProvider.ts
│   │   └── useTheme.ts
│   │
│   ├── workers/                # Web Workers
│   │   └── tokenizer.worker.ts       # GPT tokenizer
│   │
│   ├── types/                  # Shared TypeScript types
│   │   └── index.ts
│   │
│   ├── App.tsx                 # Root component
│   ├── main.tsx               # Entry point
│   └── index.css              # Global styles
│
├── tests/
│   ├── e2e/                    # End-to-end tests (Playwright)
│   │   ├── dark-mode.spec.ts
│   │   ├── error-scenarios.spec.ts
│   │   ├── github-flow.spec.ts
│   │   └── local-flow.spec.ts
│   │
│   ├── test-config.ts          # Test configuration (git-ignored)
│   └── test-config.example.ts  # Template
│
├── public/                     # Static assets
├── dist/                       # Build output (git-ignored)
│
├── .eslintrc.cjs              # ESLint configuration
├── .prettierrc                # Prettier configuration
├── tsconfig.json              # TypeScript configuration
├── vite.config.ts             # Vite configuration
├── playwright.config.ts       # Playwright configuration
├── vitest.config.ts           # Vitest configuration
└── package.json               # Dependencies & scripts
```

### Key Directories Explained

**`features/`** - Domain-driven feature modules. Each feature (GitHub, Local, etc.) is self-contained with its provider implementation, UI components, and tests.

**`components/`** - Shared UI components used across features. Organized by functionality (ui, file-tree, filters).

**`lib/`** - Core business logic independent of UI framework. Could be extracted to a separate package if needed.

**`store/`** - Centralized state management using Zustand slices pattern. Each slice manages a specific concern.

**`workers/`** - Web Workers for CPU-intensive tasks. Keeps UI thread responsive.

## 🧪 Testing Strategy

### Testing Pyramid

```
       /\
      /  \     E2E (Playwright)      - 25 tests
     /____\    Critical user flows
    /      \
   /        \  Integration            - Provider + UI
  /__________\
 /            \ Unit (Vitest)         - 80%+ coverage
/______________\ Business logic, utilities, components
```

### Unit Tests (Vitest + React Testing Library)

**What to test:**
- Pure functions (formatters, parsers, utilities)
- React components in isolation
- Provider methods
- Store actions and selectors

**Example:**

```typescript
// lib/formatter/__tests__/Formatter.test.ts
describe('Formatter', () => {
  it('should format directory tree', () => {
    const tree = [
      { path: 'src', type: 'tree' },
      { path: 'src/index.ts', type: 'blob' },
    ];

    const formatted = Formatter.formatTree(tree);

    expect(formatted).toContain('├── 📁 src');
    expect(formatted).toContain('└── 📄 index.ts');
  });

  it('should count tokens accurately', () => {
    const text = 'Hello world';
    const count = Formatter.countTokens(text);
    expect(count).toBeGreaterThan(0);
  });
});
```

### Integration Tests

**What to test:**
- Provider + FileTree interactions
- Filter + FileTree updates
- Store + Component integration

**Example:**

```typescript
describe('GitHub Provider Integration', () => {
  it('should load and display file tree', async () => {
    const provider = new GitHubProvider();
    const tree = await provider.fetchTree('https://github.com/facebook/react');

    render(<FileTree nodes={tree} />);

    expect(screen.getByText('package.json')).toBeInTheDocument();
  });
});
```

### E2E Tests (Playwright)

**What to test:**
- Complete user workflows
- Cross-browser compatibility
- Real API interactions

**Current Coverage:**
- ✅ Dark mode (5 tests)
- ✅ Error scenarios (8 tests)
- ✅ GitHub flow (6 tests)
- ✅ Local flow (6 tests)

**Example:**

```typescript
// tests/e2e/github-flow.spec.ts
test('should complete full GitHub public repo flow', async ({ page }) => {
  await page.goto('/');

  // Enter URL
  const urlInput = page.getByPlaceholder('https://github.com/facebook/react');
  await urlInput.fill('https://github.com/abinthomasonline/repo2txt');

  // Load repo
  const loadButton = page.getByRole('button', { name: /Load Repository/i });
  await loadButton.click();

  // Verify file tree
  await expect(page.getByTestId('file-tree-heading')).toBeVisible({ timeout: 30000 });

  // Generate output
  const generateButton = page.getByTestId('generate-output-button');
  await generateButton.click();

  // Verify output
  await expect(page.getByText('Directory Structure:')).toBeVisible();

  // Download
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /Download/i }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.txt/);
});
```

### Running Tests

```bash
# Unit tests
npm run test:unit              # Run once
npm run test:watch             # Watch mode
npm run test:coverage          # With coverage

# E2E tests
npm run test:e2e              # All browsers
npm run test:e2e -- --project=chromium  # Single browser
npm run test:e2e:ui           # Interactive UI

# Test specific file
npm run test:unit -- Formatter.test.ts
npm run test:e2e -- github-flow.spec.ts
```

### Test Configuration

**E2E Test Token Setup:**

```bash
# Copy template
cp tests/test-config.example.ts tests/test-config.ts

# Add your token to test-config.ts
export const testConfig = {
  githubToken: process.env.GITHUB_TOKEN || 'your_token_here',
};
```

**CI Configuration:**

Tests run automatically on PRs via GitHub Actions. Set `GITHUB_TOKEN` secret in repository settings for E2E tests.

## 💅 Code Style

### TypeScript

- **Strict mode enabled** - No implicit any, strict null checks
- **Explicit return types** - For public functions and methods
- **Interface over type** - Prefer interfaces for object shapes
- **Functional style** - Prefer pure functions, immutability

**Example:**

```typescript
// ✅ Good
interface FileNode {
  path: string;
  type: 'blob' | 'tree';
  children?: FileNode[];
}

function filterNodes(nodes: FileNode[], predicate: (node: FileNode) => boolean): FileNode[] {
  return nodes.filter(predicate).map(node => ({
    ...node,
    children: node.children ? filterNodes(node.children, predicate) : undefined,
  }));
}

// ❌ Bad
function filterNodes(nodes: any, predicate): any {
  return nodes.filter(predicate);
}
```

### React Components

- **Functional components** - Use hooks, avoid class components
- **Named exports** - Except for default component export
- **Props interfaces** - Named after component: `ComponentNameProps`
- **Early returns** - Handle edge cases first

**Example:**

```typescript
// ✅ Good
interface FileTreeNodeProps {
  node: TreeNode;
  depth: number;
  onToggle: (path: string) => void;
}

export function FileTreeNode({ node, depth, onToggle }: FileTreeNodeProps) {
  if (!node) return null;

  const isDirectory = node.type === 'tree';

  return (
    <div style={{ paddingLeft: `${depth * 16}px` }}>
      <button onClick={() => onToggle(node.path)}>
        {isDirectory ? '📁' : '📄'} {node.name}
      </button>
    </div>
  );
}
```

### CSS/Tailwind

- **Tailwind first** - Use utility classes
- **Component classes** - For reusable patterns, define in component
- **Dark mode** - Always add dark: variants
- **Responsive** - Mobile-first with sm:, md:, lg: breakpoints

**Example:**

```tsx
// ✅ Good
<div className="flex items-center gap-2 p-4 bg-white dark:bg-gray-900 rounded-lg">
  <button className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors">
    Click me
  </button>
</div>

// ❌ Bad
<div style={{ display: 'flex', padding: '16px', backgroundColor: '#fff' }}>
  <button style={{ padding: '8px 16px', backgroundColor: '#3b82f6' }}>
    Click me
  </button>
</div>
```

### File Naming

- **Components**: PascalCase (e.g., `FileTree.tsx`, `ErrorDialog.tsx`)
- **Utilities**: camelCase (e.g., `formatTree.ts`, `parseUrl.ts`)
- **Types**: PascalCase (e.g., `FileNode`, `ProviderType`)
- **Tests**: Same as file + `.test.ts` or `.spec.ts`

### Code Organization

**Import Order:**

```typescript
// 1. React/external libraries
import { useState, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

// 2. Internal imports (@/ aliases)
import { BaseProvider } from '@/lib/providers/BaseProvider';
import { FileTree } from '@/components/file-tree/FileTree';

// 3. Types
import type { FileNode, ProviderType } from '@/types';

// 4. Relative imports
import { formatTree } from './utils';

// 5. Styles (if any)
import './styles.css';
```

### ESLint & Prettier

All code must pass linting and formatting:

```bash
npm run lint          # Check for issues
npm run lint:fix      # Auto-fix
npm run format        # Format with Prettier
npm run format:check  # Check formatting
```

## 🔄 Development Workflow

### Branch Strategy

- **`master`** - Production-ready code
- **`v2-development`** - Main development branch
- **`feature/*`** - New features (e.g., `feature/gitlab-support`)
- **`fix/*`** - Bug fixes (e.g., `fix/token-storage`)
- **`refactor/*`** - Code refactoring (e.g., `refactor/provider-interface`)

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code refactoring
- `test`: Test changes
- `docs`: Documentation
- `style`: Code style changes (formatting)
- `perf`: Performance improvements
- `chore`: Build process, dependencies

**Examples:**

```bash
git commit -m "feat(github): support branch names with slashes"
git commit -m "fix(ui): correct dark mode toggle sequence"
git commit -m "test(e2e): add error dialog tests"
git commit -m "docs: update architecture documentation"
```

### Pull Request Process

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature
   ```

2. **Make Changes**
   - Write code
   - Add tests
   - Update documentation
   - Run quality checks

3. **Test Locally**
   ```bash
   npm run ci          # Type check + lint + unit tests
   npm run test:e2e    # E2E tests
   ```

4. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat(scope): your feature description"
   ```

5. **Push to GitHub**
   ```bash
   git push origin feature/your-feature
   ```

6. **Create Pull Request**
   - Fill out PR template
   - Link related issues
   - Request reviews

7. **Address Review Feedback**
   - Make requested changes
   - Push additional commits
   - Re-request review

8. **Merge**
   - Squash merge for feature branches
   - Merge commit for releases

### PR Checklist

Before submitting a PR:

- [ ] Code follows style guide
- [ ] All tests pass locally
- [ ] Added tests for new features
- [ ] Updated documentation
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] Formatted with Prettier
- [ ] Tested in multiple browsers (if UI change)
- [ ] Tested dark mode (if UI change)
- [ ] Added/updated comments for complex logic
- [ ] No console.logs or debugger statements
- [ ] Bundle size impact is acceptable

## 🐛 Debugging Tips

### React DevTools

Install [React DevTools](https://react.dev/learn/react-developer-tools) for component inspection and state debugging.

### Zustand DevTools

DevTools integration is enabled in development:

```typescript
// Inspect store in browser console
window.__ZUSTAND_STORE__
```

### Vite Debug Mode

```bash
# Enable verbose logging
DEBUG=vite:* npm run dev
```

### Common Issues

**Issue: E2E tests failing with rate limit**
- Add GitHub token to `tests/test-config.ts`

**Issue: Build fails with TypeScript errors**
- Run `npm run typecheck` to see all errors
- Use `npm run build:check` for strict type checking

**Issue: Virtual scrolling not working**
- Check parent container has fixed height
- Verify `flattenTree` function is memoized

**Issue: Web Worker not loading**
- Check worker file path in Vite config
- Ensure worker is imported with `?worker` suffix

## 📚 Additional Resources

- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vite Guide](https://vitejs.dev/guide/)
- [Zustand Documentation](https://zustand-demo.pmnd.rs/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Playwright Documentation](https://playwright.dev/)

## 💬 Questions?

- **GitHub Discussions**: [Ask questions](https://github.com/abinthomasonline/repo2txt/discussions)
- **Issues**: [Report bugs](https://github.com/abinthomasonline/repo2txt/issues)
- **Email**: abinthomasonline@gmail.com

---

Thank you for contributing to repo2txt! 🎉
