# repo2txt v2.0 - Complete Redesign Implementation Plan

## Executive Summary

This document outlines the complete redesign of repo2txt from a monolithic vanilla JavaScript application to a modern, maintainable React + TypeScript architecture. The redesign addresses technical debt, security vulnerabilities, performance bottlenecks, and enables systematic implementation of all open issues and PRs.

**Approach:** Clean rebuild in new branch → Beta testing → Gradual rollout

**Tech Stack:** React 18 + TypeScript + Vite + TailwindCSS + Zustand + Vitest + Playwright

---

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [Critical Issues to Address](#critical-issues-to-address)
3. [Architecture Design](#architecture-design)
4. [Technology Stack](#technology-stack)
5. [Project Structure](#project-structure)
6. [Implementation Phases](#implementation-phases)
7. [Feature Implementation Matrix](#feature-implementation-matrix)
8. [Testing Strategy](#testing-strategy)
9. [Migration & Deployment](#migration--deployment)
10. [Success Criteria](#success-criteria)

---

## Current State Analysis

### What Works Well

✅ **Core Functionality**
- GitHub repository fetching via API with smart branch/path parsing
- Local directory upload with webkitdirectory API
- Zip file support (.zip, .rar, .7z)
- Gitignore parsing and file filtering
- Directory tree visualization with checkboxes
- Token counting with cl100k_base tokenizer
- Clipboard and download functionality

✅ **User Experience**
- Simple, intuitive interface
- Browser-only (no server required)
- Privacy-focused (all processing client-side)
- Common file extensions pre-selected

### Critical Problems Identified

#### **SECURITY VULNERABILITIES (HIGH PRIORITY)**

1. **Personal Access Token Storage**
   - **Issue:** Tokens stored in plain text in localStorage
   - **Risk:** HIGH - XSS attacks can steal tokens with full repo access
   - **Location:** `index.js` lines 12-24
   - **Impact:** Any malicious script on the domain can read tokens

2. **innerHTML Without Sanitization**
   - **Issue:** Direct innerHTML usage in token count display
   - **Location:** `utils.js` line 307
   - **Risk:** MEDIUM - Currently safe but vulnerable to future changes

3. **JSON.parse Without Try-Catch**
   - **Issue:** Checkbox values parsed without validation
   - **Location:** `utils.js` line 254
   - **Risk:** MEDIUM - App crashes if data is malformed

4. **No CDN Integrity Checks**
   - **Issue:** No SRI (Subresource Integrity) on external libraries
   - **Risk:** MEDIUM - Compromised CDN could serve malicious code

#### **PERFORMANCE BOTTLENECKS**

1. **Recursive updateParentCheckbox() on Every Change**
   - **Issue:** O(tree height) DOM operations per checkbox click
   - **Impact:** Noticeable lag with 1000+ files
   - **Location:** `utils.js` line 44-45

2. **Unlimited Concurrent Requests**
   - **Issue:** Promise.all() with no concurrency limit
   - **Impact:** Can overwhelm browser/network with 100+ files
   - **Location:** `index.js` line 259

3. **Synchronous Token Encoding**
   - **Issue:** Blocks UI thread for large files
   - **Impact:** Freezes for seconds on 1MB+ text
   - **Location:** `utils.js` line 306

4. **DOM Query Performance**
   - **Issue:** Complex selectors query entire tree on every operation
   - **Impact:** Slows down with large repositories

5. **Inefficient Sorting**
   - **Issue:** Path splitting happens in every comparison
   - **Impact:** O(n log n) * O(path length)

#### **CODE QUALITY ISSUES**

1. **Code Duplication**
   - ~60% overlap between `index.js` (308 lines) and `local.js` (225 lines)
   - Duplicate clipboard, download, error handling logic

2. **No State Management**
   - State scattered across DOM and global variables
   - Global `pathZipMap` in `local.js` line 5
   - No single source of truth

3. **Mixed Concerns**
   - UI logic, business logic, and API calls intertwined
   - Hard to test individual components

4. **Error Handling Gaps**
   - Gitignore regex errors silently fail
   - No warning if GPTTokenizer doesn't load
   - No blob size limits (can crash browser)

5. **Typo Throughout Codebase**
   - `extention` instead of `extension` (3 occurrences)

#### **GITIGNORE LIMITATIONS**

Missing patterns:
- ❌ Negation patterns (`!important.txt`)
- ❌ Double-asterisk globbing (`dir/**/file`)
- ❌ Character classes (`[abc]`)
- ❌ Directory-only rules distinction
- ⚠️ Inline comments not handled

#### **EXTENSIBILITY CHALLENGES**

Adding GitLab or Azure DevOps support would require:
- Duplicating entire provider logic
- More mixed concerns
- No clear abstraction layer

---

## Critical Issues to Address

### From Open Issues

| # | Title | Status | Priority | Complexity |
|---|-------|--------|----------|------------|
| 26 | Add dark mode | Open | HIGH | Low |
| 24 | GitLab private repo support | Open | HIGH | Medium |
| 20 | Show excluded files in structure | Open | MEDIUM | Low |
| 18 | Show line/token count per file | Open | HIGH | Medium |
| 14 | Mobile support | Open | HIGH | Medium |
| 13 | Include/exclude filter feature | Open | HIGH | Medium |
| 4 | ADO (Azure DevOps) support | Open | MEDIUM | High |

### From Open PRs

| # | Title | Status | Priority | Complexity |
|---|-------|--------|----------|------------|
| 28 | Password input for token | Open | HIGH | Trivial |
| 27 | Dark mode implementation | Open | HIGH | Low |
| 23 | Download with repo/folder name | Open | MEDIUM | Low |
| 19 | Add GitHub issues to prompt | Open | MEDIUM | Medium |
| 17 | Show all files + Node.js server | Open | MEDIUM | Medium |
| 16 | Chrome extension version | Open | LOW | High |

### From Code Analysis

**Must Fix:**
- Token storage security
- Rate limiting for API calls
- Performance optimizations
- Gitignore pattern support
- Error handling gaps

**Should Fix:**
- Typo: extention → extension
- Add SRI attributes
- Implement proper state management
- Separate concerns

**Nice to Have:**
- Web Worker for tokenization
- Virtual scrolling for large repos
- Service Worker for offline support

---

## Architecture Design

### Core Principles

1. **Separation of Concerns**
   - Core business logic independent of UI
   - Provider pattern for data sources
   - Clear boundaries between layers

2. **Type Safety**
   - TypeScript throughout
   - Strict mode enabled
   - Comprehensive type definitions

3. **Testability**
   - Pure functions where possible
   - Dependency injection
   - Mock-friendly abstractions

4. **Performance**
   - Virtual scrolling for large trees
   - Web Workers for heavy operations
   - Optimized re-renders with React.memo

5. **Extensibility**
   - Easy to add new providers (GitLab, ADO)
   - Plugin architecture for formatters
   - Composable components

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         UI Layer                             │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   React     │  │   Tailwind   │  │   Radix UI   │       │
│  │ Components  │  │     CSS      │  │  Primitives  │       │
│  └─────────────┘  └──────────────┘  └──────────────┘       │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────┴────────────────────────────────┐
│                     State Layer (Zustand)                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  App State: provider, fileTree, theme, selections   │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────┴────────────────────────────────┐
│                      Business Logic                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Provider   │  │   FileTree   │  │  Formatter   │      │
│  │  Interface   │  │    Manager   │  │   & Tokens   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                             │
┌────────────────────────────┴────────────────────────────────┐
│                     Data Providers                           │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│  │ GitHub  │  │  Local  │  │ GitLab  │  │  Azure  │        │
│  │Provider │  │Provider │  │Provider │  │Provider │        │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘        │
└─────────────────────────────────────────────────────────────┘
```

### Provider Pattern

All data sources implement the same interface:

```typescript
interface IProvider {
  // Metadata
  getType(): ProviderType;
  getName(): string;

  // Authentication
  requiresAuth(): boolean;
  setCredentials(credentials: ProviderCredentials): void;

  // Data fetching
  fetchTree(url: string, options?: FetchOptions): Promise<FileNode[]>;
  fetchFile(node: FileNode): Promise<string>;
  fetchMultiple(nodes: FileNode[]): AsyncGenerator<FileContent>;

  // Repository info
  getRepoInfo(): RepoMetadata;
}
```

Benefits:
- GitLab support = new class implementing IProvider
- ADO support = same
- Easy to mock for testing
- Swap providers without UI changes

---

## Technology Stack

### Core Technologies

**React 18**
- Concurrent features for better UX
- Suspense for lazy loading
- Automatic batching

**TypeScript 5.x**
- Strict mode enabled
- Full type coverage
- Better refactoring

**Vite**
- Lightning-fast HMR
- Optimized builds
- Plugin ecosystem

**TailwindCSS 3.x**
- Utility-first CSS
- Dark mode built-in
- Minimal bundle with purging

### Libraries

**State Management: Zustand**
- Lightweight (1KB)
- Simple API
- DevTools support
- No boilerplate

**UI Components: Radix UI**
- Accessible by default
- Unstyled (works with Tailwind)
- Keyboard navigation
- ARIA labels built-in

**Forms: React Hook Form**
- Performant (uncontrolled)
- Easy validation
- TypeScript support

**File Processing:**
- JSZip for archives
- gpt-tokenizer for counting
- Custom gitignore parser

**Testing:**
- Vitest for unit/integration
- React Testing Library
- Playwright for E2E
- MSW for API mocking

**Build & Dev:**
- ESLint + TypeScript-ESLint
- Prettier
- Husky for git hooks
- GitHub Actions for CI/CD

---

## Project Structure

```
repo2txt-v2/
├── src/
│   ├── main.tsx                      # Entry point
│   ├── App.tsx                       # Root component
│   │
│   ├── features/                     # Feature-based modules
│   │   ├── github/
│   │   │   ├── components/
│   │   │   │   ├── GitHubAuth.tsx
│   │   │   │   └── GitHubUrlInput.tsx
│   │   │   ├── GitHubProvider.ts
│   │   │   ├── types.ts
│   │   │   └── __tests__/
│   │   ├── local/
│   │   │   ├── components/
│   │   │   │   ├── DirectoryPicker.tsx
│   │   │   │   └── ZipUploader.tsx
│   │   │   ├── LocalProvider.ts
│   │   │   └── __tests__/
│   │   ├── gitlab/                   # Future
│   │   │   ├── GitLabProvider.ts
│   │   │   └── ...
│   │   └── azure/                    # Future
│   │       ├── AzureProvider.ts
│   │       └── ...
│   │
│   ├── components/                   # Shared UI components
│   │   ├── FileTree/
│   │   │   ├── FileTree.tsx
│   │   │   ├── FileTreeNode.tsx
│   │   │   ├── VirtualTree.tsx      # For large repos
│   │   │   ├── useFileTree.ts       # Hook
│   │   │   ├── fileTree.module.css
│   │   │   └── __tests__/
│   │   ├── ExtensionFilter/
│   │   │   ├── ExtensionFilter.tsx
│   │   │   ├── ExtensionChip.tsx
│   │   │   └── __tests__/
│   │   ├── OutputPanel/
│   │   │   ├── OutputPanel.tsx
│   │   │   ├── OutputToolbar.tsx
│   │   │   ├── TokenCounter.tsx
│   │   │   └── __tests__/
│   │   ├── SourceSelector/
│   │   │   ├── SourceSelector.tsx
│   │   │   ├── ProviderCard.tsx
│   │   │   └── __tests__/
│   │   ├── GitIgnoreEditor/         # Issue #13
│   │   │   ├── GitIgnoreEditor.tsx
│   │   │   └── PatternValidator.tsx
│   │   └── ui/                       # Base UI components
│   │       ├── Button.tsx
│   │       ├── Checkbox.tsx
│   │       ├── Input.tsx
│   │       ├── Dialog.tsx
│   │       ├── Tabs.tsx
│   │       └── ThemeToggle.tsx
│   │
│   ├── lib/                          # Core business logic
│   │   ├── providers/
│   │   │   ├── types.ts
│   │   │   ├── BaseProvider.ts
│   │   │   └── ProviderFactory.ts
│   │   ├── file-tree/
│   │   │   ├── FileTree.ts          # Tree data structure
│   │   │   ├── FileNode.ts
│   │   │   ├── FileFilter.ts
│   │   │   ├── TreeBuilder.ts
│   │   │   └── __tests__/
│   │   ├── gitignore/
│   │   │   ├── GitIgnoreParser.ts
│   │   │   ├── PatternMatcher.ts
│   │   │   ├── patterns.ts          # Pattern rules
│   │   │   └── __tests__/
│   │   ├── formatter/
│   │   │   ├── TextFormatter.ts
│   │   │   ├── TreeFormatter.ts
│   │   │   ├── Tokenizer.ts
│   │   │   ├── tokenizer.worker.ts  # Web Worker
│   │   │   └── __tests__/
│   │   └── utils/
│   │       ├── download.ts
│   │       ├── clipboard.ts
│   │       ├── storage.ts           # Secure storage
│   │       ├── api.ts               # Rate limiting
│   │       ├── validation.ts
│   │       └── __tests__/
│   │
│   ├── hooks/                        # Custom React hooks
│   │   ├── useTheme.ts
│   │   ├── useFileSelection.ts
│   │   ├── useProvider.ts
│   │   ├── useTokenCount.ts
│   │   ├── useClipboard.ts
│   │   ├── useDownload.ts
│   │   └── useRateLimiter.ts
│   │
│   ├── store/                        # Zustand store
│   │   ├── index.ts
│   │   ├── slices/
│   │   │   ├── providerSlice.ts
│   │   │   ├── fileTreeSlice.ts
│   │   │   ├── uiSlice.ts
│   │   │   └── settingsSlice.ts
│   │   └── __tests__/
│   │
│   ├── workers/                      # Web Workers
│   │   ├── tokenizer.worker.ts
│   │   └── parser.worker.ts
│   │
│   ├── styles/
│   │   ├── globals.css
│   │   ├── themes.css
│   │   └── variables.css
│   │
│   └── types/                        # Global TypeScript types
│       ├── index.ts
│       ├── provider.ts
│       ├── fileTree.ts
│       └── api.ts
│
├── tests/
│   ├── unit/
│   │   └── ... (colocated with source)
│   ├── integration/
│   │   ├── github-provider.test.ts
│   │   ├── local-provider.test.ts
│   │   └── file-tree.test.ts
│   ├── e2e/
│   │   ├── github-flow.spec.ts
│   │   ├── local-flow.spec.ts
│   │   ├── dark-mode.spec.ts
│   │   └── mobile.spec.ts
│   ├── fixtures/
│   │   ├── sample-repos/
│   │   └── mock-responses/
│   └── setup.ts
│
├── public/
│   ├── index.html
│   ├── favicon.ico
│   └── assets/
│
├── docs/
│   ├── ARCHITECTURE.md
│   ├── API.md
│   ├── CONTRIBUTING.md
│   └── MIGRATION.md
│
├── .github/
│   └── workflows/
│       ├── ci.yml
│       ├── e2e.yml
│       ├── deploy-beta.yml
│       └── deploy-prod.yml
│
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
├── playwright.config.ts
├── .eslintrc.cjs
├── .prettierrc
└── README.md
```

---

## Implementation Phases

### Phase 0: Project Setup & Infrastructure

**Goal:** Set up development environment and tooling

**Tasks:**
- [ ] Initialize Vite + React + TypeScript project
- [ ] Configure TypeScript (strict mode)
- [ ] Set up TailwindCSS with dark mode
- [ ] Configure ESLint + Prettier
- [ ] Set up Vitest for unit testing
- [ ] Set up Playwright for E2E testing
- [ ] Configure Husky for pre-commit hooks
- [ ] Set up GitHub Actions CI pipeline
- [ ] Create initial project structure
- [ ] Set up Zustand store with DevTools
- [ ] Configure path aliases (@/, @components/, etc.)
- [ ] Add Radix UI dependencies

**Deliverables:**
- Working dev environment
- Basic app shell
- CI pipeline running
- Deployable to beta subdomain

---

### Phase 1: Core Architecture & Provider System

**Goal:** Build the foundation - provider pattern and file tree

**Tasks:**
- [ ] Define TypeScript interfaces for providers
- [ ] Implement BaseProvider abstract class
- [ ] Create FileNode and FileTree classes
- [ ] Implement TreeBuilder utility
- [ ] Create ProviderFactory
- [ ] Write unit tests for core classes
- [ ] Implement basic error handling
- [ ] Create provider store slice
- [ ] Set up API rate limiting utility
- [ ] Implement secure storage utility (for tokens)

**Deliverables:**
- Tested provider interface
- File tree data structure
- Provider factory pattern
- Rate limiting system

---

### Phase 2: GitHub Provider (Port Existing Functionality)

**Goal:** Port GitHub functionality to new architecture

**Tasks:**
- [ ] Implement GitHubProvider class
  - [ ] URL parsing with regex
  - [ ] Branch/tag reference resolution
  - [ ] Tree fetching with recursive API call
  - [ ] File content fetching with concurrency control
  - [ ] Error handling (404, 403, rate limits)
- [ ] Create GitHubAuth component
  - [ ] Password input for token (PR #28) ✓
  - [ ] Secure token storage (sessionStorage + encryption)
  - [ ] Token validation
- [ ] Create GitHubUrlInput component
  - [ ] URL validation
  - [ ] Branch/path parsing hints
- [ ] Write integration tests
- [ ] Add GitHub issues fetching (PR #19)
  - [ ] Fetch issues via API
  - [ ] Format issues for prompt
  - [ ] Toggle in UI

**Deliverables:**
- Working GitHub provider
- Secure token handling
- GitHub issues integration
- Comprehensive tests

---

### Phase 3: Local Provider (Port & Enhance)

**Goal:** Port local directory functionality with improvements

**Tasks:**
- [ ] Implement LocalProvider class
  - [ ] Directory upload via webkitdirectory
  - [ ] Zip file support (JSZip)
  - [ ] Lazy content loading
  - [ ] Progress tracking
- [ ] Create DirectoryPicker component
  - [ ] Mobile-friendly file picker
  - [ ] Progress indicator
- [ ] Create ZipUploader component
  - [ ] Drag & drop support
  - [ ] Format validation (.zip, .rar, .7z)
  - [ ] Extraction progress
- [ ] Optimize for mobile (Issue #14)
  - [ ] Touch-friendly UI
  - [ ] Responsive design
  - [ ] Bottom sheet for actions
- [ ] Write integration tests

**Deliverables:**
- Working local provider
- Mobile-optimized UI
- Zip support with progress
- Tests

---

### Phase 4: UI Components (File Tree & Filters)

**Goal:** Build the core UI with performance optimizations

**Tasks:**
- [ ] Create FileTree component
  - [ ] Virtual scrolling for 1000+ files
  - [ ] Checkbox state management
  - [ ] Collapse/expand directories
  - [ ] Keyboard navigation
  - [ ] ARIA labels
- [ ] Create FileTreeNode component
  - [ ] Icon based on file type
  - [ ] Indeterminate checkbox states
  - [ ] Line/token count badge (Issue #18) ✓
  - [ ] Context menu
- [ ] Create ExtensionFilter component
  - [ ] Sorted by frequency
  - [ ] Batch select/deselect
  - [ ] Custom extension input
- [ ] Create GitIgnoreEditor component (Issue #13)
  - [ ] Pattern input textarea
  - [ ] Live validation
  - [ ] Pattern suggestions
  - [ ] Apply/reset buttons
- [ ] Implement "Show excluded files" toggle (Issue #20)
  - [ ] Display excluded files grayed out
  - [ ] Checkbox to toggle visibility
- [ ] Write component tests

**Deliverables:**
- Performant file tree
- Extension filtering
- Gitignore editor
- Accessibility compliant
- Component test coverage

---

### Phase 5: Gitignore Parser (Enhanced)

**Goal:** Comprehensive gitignore pattern support

**Tasks:**
- [ ] Implement GitIgnoreParser class
  - [ ] Support negation patterns (`!file`)
  - [ ] Support double-asterisk (`**/file`)
  - [ ] Support character classes (`[abc]`)
  - [ ] Support directory-only rules (`dir/`)
  - [ ] Handle comments (inline and full-line)
  - [ ] Handle escaped characters
- [ ] Create PatternMatcher utility
  - [ ] Convert patterns to regex
  - [ ] Optimize matching
  - [ ] Cache compiled patterns
- [ ] Write comprehensive tests
  - [ ] Test suite with 50+ patterns
  - [ ] Edge cases
  - [ ] Performance benchmarks

**Deliverables:**
- Full gitignore spec support
- Fast pattern matching
- Comprehensive test coverage

---

### Phase 6: Formatter & Tokenizer (with Web Worker)

**Goal:** Efficient text formatting and token counting

**Tasks:**
- [ ] Implement TextFormatter class
  - [ ] Format file contents
  - [ ] Generate directory tree structure
  - [ ] Format GitHub issues (PR #19)
- [ ] Implement TreeFormatter
  - [ ] ASCII tree generation
  - [ ] Include/exclude indicators
- [ ] Create Tokenizer class
  - [ ] Integrate gpt-tokenizer
  - [ ] Per-file token count (Issue #18) ✓
  - [ ] Total token count
  - [ ] Multiple tokenizer support (cl100k_base, o200k_base)
- [ ] Move tokenization to Web Worker
  - [ ] Non-blocking UI
  - [ ] Progress reporting
  - [ ] Cancellable
- [ ] Write tests

**Deliverables:**
- Fast, non-blocking tokenization
- Per-file and total counts
- Multiple tokenizer support
- Tests

---

### Phase 7: Output Panel & Actions

**Goal:** Output display with copy, download, and zip generation

**Tasks:**
- [ ] Create OutputPanel component
  - [ ] Syntax highlighting (optional)
  - [ ] Line numbers
  - [ ] Scroll to file
- [ ] Create OutputToolbar component
  - [ ] Copy to clipboard button
  - [ ] Download text button
  - [ ] Download zip button
  - [ ] Share button (future)
- [ ] Implement download with repo name (PR #23) ✓
  - [ ] Extract repo/folder name
  - [ ] Use as filename
- [ ] Create TokenCounter component
  - [ ] Live count updates
  - [ ] Tokenizer selection dropdown
  - [ ] Cost estimation (optional)
- [ ] Optimize clipboard for large text
  - [ ] Fallback for old browsers
  - [ ] Progress indicator
- [ ] Write tests

**Deliverables:**
- Full-featured output panel
- Smart filename generation
- Robust clipboard handling
- Tests

---

### Phase 8: Dark Mode & Theming

**Goal:** Complete dark mode support with persistence

**Tasks:**
- [ ] Implement theme system
  - [ ] CSS variables for colors
  - [ ] Tailwind dark mode config
  - [ ] System preference detection
- [ ] Create ThemeToggle component
  - [ ] Sun/moon icon
  - [ ] Smooth transitions
- [ ] Create useTheme hook
  - [ ] Persist preference (localStorage)
  - [ ] System preference listener
- [ ] Apply dark mode to all components
  - [ ] File tree
  - [ ] Output panel
  - [ ] Dialogs
  - [ ] Forms
- [ ] Merge PR #27 patterns
- [ ] Write visual regression tests

**Deliverables:**
- Complete dark mode
- Theme persistence
- System preference sync
- Visual tests

---

### Phase 9: GitLab Provider (Issue #24)

**Goal:** Add GitLab support including private repos

**Tasks:**
- [ ] Implement GitLabProvider class
  - [ ] URL parsing for GitLab
  - [ ] API authentication (personal access token)
  - [ ] Tree fetching via API
  - [ ] File fetching
  - [ ] Support for self-hosted GitLab
- [ ] Create GitLabAuth component
  - [ ] Token input
  - [ ] Instance URL input (for self-hosted)
- [ ] Update SourceSelector
  - [ ] Add GitLab option
- [ ] Write integration tests
- [ ] Documentation

**Deliverables:**
- Working GitLab provider
- Support for GitLab.com and self-hosted
- Tests and docs

---

### Phase 10: Azure DevOps Provider (Issue #4)

**Goal:** Add Azure DevOps repository support

**Tasks:**
- [ ] Implement AzureProvider class
  - [ ] URL parsing for ADO
  - [ ] API authentication (PAT)
  - [ ] Tree fetching
  - [ ] File fetching
- [ ] Create AzureAuth component
  - [ ] Token input
  - [ ] Organization/project inputs
- [ ] Update SourceSelector
  - [ ] Add Azure option
- [ ] Write integration tests
- [ ] Documentation

**Deliverables:**
- Working Azure DevOps provider
- Tests and docs

---

### Phase 11: Performance Optimizations

**Goal:** Optimize for large repositories and slow connections

**Tasks:**
- [ ] Implement virtual scrolling
  - [ ] Use react-window or similar
  - [ ] Only render visible nodes
  - [ ] Smooth scrolling
- [ ] Optimize checkbox updates
  - [ ] Batch state updates
  - [ ] Memoize components
  - [ ] Reduce re-renders
- [ ] Implement request queuing
  - [ ] Max 10 concurrent requests
  - [ ] Priority queue
  - [ ] Progress tracking
- [ ] Add lazy loading
  - [ ] Defer non-critical components
  - [ ] Code splitting by provider
- [ ] Add caching layer
  - [ ] Cache API responses (IndexedDB)
  - [ ] Cache parsed trees
  - [ ] Invalidation strategy
- [ ] Performance benchmarks
  - [ ] Lighthouse CI
  - [ ] Load time targets
  - [ ] Bundle size budgets

**Deliverables:**
- Handles 10,000+ file repos smoothly
- Fast initial load
- Optimized bundle size
- Performance metrics

---

### Phase 12: Mobile Optimization (Issue #14)

**Goal:** Full mobile support with native-like experience

**Tasks:**
- [ ] Mobile-first responsive design
  - [ ] Collapsible file tree
  - [ ] Bottom sheets for actions
  - [ ] Touch-friendly targets (44px min)
- [ ] Optimize for touch
  - [ ] Swipe gestures
  - [ ] Pull to refresh
  - [ ] Long press menus
- [ ] Handle mobile constraints
  - [ ] Memory management
  - [ ] Reduce animations
  - [ ] Optimize images
- [ ] Test on real devices
  - [ ] iOS Safari
  - [ ] Android Chrome
  - [ ] Various screen sizes
- [ ] PWA features (optional)
  - [ ] Add to home screen
  - [ ] Offline support
  - [ ] App manifest

**Deliverables:**
- Fully functional on mobile
- Native-like experience
- PWA-ready
- Device testing report

---

### Phase 13: Testing & Quality Assurance

**Goal:** Comprehensive test coverage and quality gates

**Tasks:**
- [ ] Achieve 80%+ unit test coverage
- [ ] Write integration tests for all providers
- [ ] Write E2E tests for critical flows
  - [ ] GitHub repo → generate → download
  - [ ] Local directory → filter → copy
  - [ ] Dark mode toggle
  - [ ] Mobile interactions
  - [ ] Error scenarios
- [ ] Cross-browser testing
  - [ ] Chrome
  - [ ] Firefox
  - [ ] Safari
  - [ ] Edge
- [ ] Accessibility audit
  - [ ] WCAG 2.1 AA compliance
  - [ ] Keyboard navigation
  - [ ] Screen reader testing
- [ ] Performance testing
  - [ ] Lighthouse scores (90+)
  - [ ] Bundle size analysis
  - [ ] Load time benchmarks
- [ ] Security audit
  - [ ] OWASP top 10
  - [ ] Dependency scanning
  - [ ] Token storage review

**Deliverables:**
- High test coverage
- Quality metrics dashboard
- Accessibility report
- Security audit report

---

### Phase 14: Documentation & Migration Guide

**Goal:** Comprehensive documentation for users and developers

**Tasks:**
- [ ] Update README
  - [ ] New features
  - [ ] Screenshots
  - [ ] Quick start
- [ ] Write ARCHITECTURE.md
  - [ ] System design
  - [ ] Provider pattern
  - [ ] State management
- [ ] Write API.md
  - [ ] Provider interface
  - [ ] Component APIs
  - [ ] Hooks documentation
- [ ] Write CONTRIBUTING.md
  - [ ] Development setup
  - [ ] Code standards
  - [ ] PR guidelines
- [ ] Write MIGRATION.md
  - [ ] What's changed
  - [ ] Breaking changes (none for users)
  - [ ] New features guide
- [ ] Create video tutorial
  - [ ] New features walkthrough
  - [ ] GitLab/Azure setup

**Deliverables:**
- Complete documentation
- Migration guide
- Video tutorial

---

### Phase 15: Beta Deployment & Feedback

**Goal:** Deploy to beta and collect user feedback

**Tasks:**
- [ ] Set up beta subdomain (beta.repo2txt.simplebasedomain.com)
- [ ] Deploy beta version
- [ ] Add feedback mechanism
  - [ ] Feedback button
  - [ ] Bug report form
  - [ ] Feature suggestions
- [ ] Add analytics (privacy-friendly)
  - [ ] Usage metrics
  - [ ] Error tracking
  - [ ] Performance monitoring
- [ ] Beta testing with volunteers
  - [ ] Invite power users
  - [ ] Test on different devices
  - [ ] Collect feedback
- [ ] Bug fixes based on feedback
- [ ] Performance tuning
- [ ] Documentation updates

**Deliverables:**
- Beta deployment live
- Feedback collection system
- Bug fixes
- Performance report

---

### Phase 16: Production Deployment & Monitoring

**Goal:** Gradual rollout to production with monitoring

**Tasks:**
- [ ] Set up production deployment
- [ ] Implement feature flags
  - [ ] Gradual rollout by percentage
  - [ ] A/B testing
- [ ] Keep legacy version accessible
  - [ ] legacy.repo2txt.simplebasedomain.com
  - [ ] Link in new version
- [ ] Set up monitoring
  - [ ] Error tracking (Sentry or similar)
  - [ ] Performance monitoring
  - [ ] User analytics
- [ ] Rollout plan
  - [ ] 10% traffic → monitor
  - [ ] 50% traffic → monitor
  - [ ] 100% traffic
- [ ] Post-launch support
  - [ ] Monitor issues
  - [ ] Quick hotfixes
  - [ ] User support

**Deliverables:**
- Production deployment
- Monitoring dashboards
- Rollout complete
- Legacy version accessible

---

## Feature Implementation Matrix

Mapping issues/PRs to implementation phases:

| Issue/PR | Feature | Phase | Components Affected |
|----------|---------|-------|---------------------|
| PR #28 | Password input for token | Phase 2 | GitHubAuth |
| Issue #26, PR #27 | Dark mode | Phase 8 | All components, ThemeToggle |
| PR #23 | Download with repo name | Phase 7 | OutputToolbar, download util |
| Issue #18 | Token/line count per file | Phase 6 | FileTreeNode, Tokenizer |
| Issue #13 | Include/exclude filters | Phase 4 | GitIgnoreEditor |
| Issue #20 | Show excluded files | Phase 4 | FileTree, FileFilter |
| PR #19 | GitHub issues in prompt | Phase 2, 6 | GitHubProvider, TextFormatter |
| Issue #14 | Mobile support | Phase 12 | All components |
| Issue #24 | GitLab support | Phase 9 | GitLabProvider, SourceSelector |
| Issue #4 | Azure DevOps support | Phase 10 | AzureProvider, SourceSelector |
| PR #17 | Show all files + Node server | Phase 4 | FileTree (show all), Skip server |
| PR #16 | Chrome extension | Future | Separate project |

**Security Fixes:**
| Issue | Fix | Phase |
|-------|-----|-------|
| Token storage | sessionStorage + encryption | Phase 2 |
| innerHTML | Use textContent/createElement | Phase 7 |
| JSON.parse | Add try-catch + validation | Phase 3 |
| No SRI | Add integrity attributes | Phase 0 |

**Performance Fixes:**
| Issue | Fix | Phase |
|-------|-----|-------|
| Recursive checkbox updates | Batch updates, memoization | Phase 4, 11 |
| Unlimited concurrency | Request queue (max 10) | Phase 2, 11 |
| Synchronous tokenization | Web Worker | Phase 6 |
| Inefficient sorting | Pre-compute, memoize | Phase 4 |

---

## Testing Strategy

### Unit Tests (Vitest + React Testing Library)

**Coverage Target:** 80%+

**Focus Areas:**
- All business logic classes (FileTree, Providers, Formatters)
- Pure utility functions
- React components (user interactions)
- Custom hooks
- Gitignore pattern matching (50+ test cases)

**Example Test Structure:**
```typescript
// lib/file-tree/__tests__/FileTree.test.ts
describe('FileTree', () => {
  describe('filter', () => {
    it('filters by extension', () => {
      const tree = new FileTree(mockNodes);
      tree.filter({ extensions: ['.ts', '.tsx'] });
      expect(tree.getVisibleNodes()).toHaveLength(5);
    });

    it('applies gitignore patterns', () => {
      const tree = new FileTree(mockNodes);
      tree.applyGitignore(['node_modules/**', '*.log']);
      expect(tree.hasNode('node_modules/package.json')).toBe(false);
    });
  });
});
```

### Integration Tests

**Focus Areas:**
- Provider + FileTree interactions
- GitHub API mocking (MSW)
- File upload flows
- State management

**Example:**
```typescript
// tests/integration/github-provider.test.ts
describe('GitHubProvider Integration', () => {
  it('fetches and builds file tree', async () => {
    const provider = new GitHubProvider();
    const tree = await provider.fetchTree(
      'https://github.com/owner/repo'
    );
    expect(tree).toBeInstanceOf(Array);
    expect(tree[0]).toHaveProperty('path');
  });
});
```

### E2E Tests (Playwright)

**Critical User Flows:**

1. **GitHub Flow**
   ```
   - Enter GitHub URL
   - Provide token (if private)
   - Fetch structure
   - Select files by extension
   - Generate text
   - Copy to clipboard
   - Download file
   ```

2. **Local Flow**
   ```
   - Select directory
   - Apply gitignore patterns
   - Filter by extension
   - Generate text
   - Download with folder name
   ```

3. **Dark Mode**
   ```
   - Toggle dark mode
   - Verify all components
   - Refresh page
   - Verify persistence
   ```

4. **Mobile Flow**
   ```
   - Open on mobile viewport
   - Upload zip file
   - Navigate file tree
   - Generate and copy
   ```

5. **Error Scenarios**
   ```
   - Invalid URL
   - Rate limit exceeded
   - Network failure
   - Large file handling
   ```

**Example E2E Test:**
```typescript
// tests/e2e/github-flow.spec.ts
test('complete GitHub flow', async ({ page }) => {
  await page.goto('/');

  await page.fill('[data-testid="github-url"]',
    'https://github.com/abinthomasonline/repo2txt'
  );
  await page.click('[data-testid="fetch-button"]');

  await page.waitForSelector('[data-testid="file-tree"]');

  await page.check('[data-testid="extension-js"]');
  await page.check('[data-testid="extension-html"]');

  await page.click('[data-testid="generate-button"]');

  await page.waitForSelector('[data-testid="output-text"]');
  const output = await page.textContent('[data-testid="output-text"]');
  expect(output).toContain('Directory Structure:');

  await page.click('[data-testid="copy-button"]');
  // Verify clipboard (requires clipboard permissions)
});
```

### Visual Regression Tests

**Tools:** Percy or Chromatic

**Components to Test:**
- File tree (various states)
- Dark mode vs light mode
- Mobile responsive layouts
- Error states
- Loading states

### Performance Tests

**Metrics:**
- Lighthouse CI (target: 90+ all metrics)
- Bundle size (target: <100KB gzipped)
- Time to Interactive (target: <2s)
- First Contentful Paint (target: <1s)

**Load Testing:**
- 100 file repo
- 1,000 file repo
- 10,000 file repo
- Measure render time, memory usage

---

## Migration & Deployment

### Branch Strategy

```
master (current production)
  ├── v2-development (new codebase)
  ├── v2-staging (testing)
  └── v2-production (ready for merge)
```

### Deployment Environments

1. **Development:** Local only
2. **Staging:** staging.repo2txt.simplebasedomain.com
3. **Beta:** beta.repo2txt.simplebasedomain.com
4. **Production:** repo2txt.simplebasedomain.com
5. **Legacy:** legacy.repo2txt.simplebasedomain.com

### Deployment Pipeline

**GitHub Actions Workflow:**

```yaml
# .github/workflows/deploy-beta.yml
name: Deploy Beta
on:
  push:
    branches: [v2-development]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run lint
      - run: npm run test:unit
      - run: npm run test:integration

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install
      - run: npm run test:e2e

  build:
    needs: [test, e2e]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run build
      - run: npm run analyze-bundle

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Beta
        # Deploy to beta subdomain
```

### Rollout Strategy

**Phase 1: Beta Testing (2-3 weeks)**
- Deploy to beta.repo2txt.simplebasedomain.com
- Add banner on main site: "Try the new beta!"
- Collect feedback via form
- Fix critical bugs
- Monitor performance

**Phase 2: Soft Launch (1 week)**
- Deploy to production
- Keep legacy accessible
- Use feature flag: 10% of users see new version
- Monitor error rates
- Collect metrics

**Phase 3: Gradual Rollout (2 weeks)**
- Increase to 25% → monitor
- Increase to 50% → monitor
- Increase to 75% → monitor
- Increase to 100%

**Phase 4: Full Launch**
- All users on new version
- Keep legacy link for 1 month
- Deprecate old version
- Celebrate! 🎉

### Backwards Compatibility

**URL Compatibility:**
- All existing URLs work the same
- No breaking changes to URL structure
- localStorage migration script (if needed)

**Feature Parity:**
- All existing features work
- Plus new features
- Better performance

**Data Migration:**
- Migrate saved tokens (if format changes)
- Migrate theme preference
- No user action required

---

## Success Criteria

### Technical Metrics

✅ **Performance**
- [ ] Lighthouse score: 90+ (all metrics)
- [ ] Bundle size: <100KB gzipped
- [ ] Time to Interactive: <2s
- [ ] Handles 10,000+ files without lag

✅ **Quality**
- [ ] Test coverage: 80%+
- [ ] Zero critical security vulnerabilities
- [ ] TypeScript strict mode: no errors
- [ ] ESLint: no warnings

✅ **Compatibility**
- [ ] Works on Chrome, Firefox, Safari, Edge
- [ ] Mobile responsive (iOS, Android)
- [ ] WCAG 2.1 AA compliant

### Feature Completion

✅ **Core Features (Parity)**
- [ ] GitHub repo fetching
- [ ] Local directory upload
- [ ] Zip file support
- [ ] Gitignore parsing
- [ ] Extension filtering
- [ ] Token counting
- [ ] Copy/download

✅ **New Features**
- [ ] Dark mode (Issues #26, #27)
- [ ] Password input (PR #28)
- [ ] GitLab support (Issue #24)
- [ ] Azure DevOps support (Issue #4)
- [ ] Token count per file (Issue #18)
- [ ] Include/exclude filters (Issue #13)
- [ ] Show excluded files (Issue #20)
- [ ] GitHub issues in prompt (PR #19)
- [ ] Download with repo name (PR #23)
- [ ] Mobile optimization (Issue #14)

### User Experience

✅ **Usability**
- [ ] Beta users report: "As good or better"
- [ ] No increase in support requests
- [ ] Positive feedback on new features
- [ ] Average session time maintained

✅ **Performance**
- [ ] Page load time: maintained or improved
- [ ] No crashes or freezes
- [ ] Smooth interactions

### Security

✅ **Security Improvements**
- [ ] Tokens in sessionStorage (not localStorage)
- [ ] Optional encryption for tokens
- [ ] SRI attributes on CDN resources
- [ ] All inputs validated
- [ ] No XSS vulnerabilities

### Documentation

✅ **Docs Complete**
- [ ] README updated
- [ ] Architecture docs
- [ ] API docs
- [ ] Contributing guide
- [ ] Migration guide
- [ ] Video tutorial

---

## Risk Assessment & Mitigation

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Performance regression | Medium | High | Extensive benchmarking, profiling |
| Browser compatibility issues | Low | Medium | Cross-browser testing, polyfills |
| Bundle size bloat | Medium | Medium | Code splitting, tree-shaking, monitoring |
| TypeScript migration bugs | Low | Medium | Gradual typing, comprehensive tests |
| Third-party library issues | Low | High | Lock versions, test updates carefully |

### User Experience Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Users dislike new UI | Low | High | Beta testing, gather feedback early |
| Breaking changes | Low | High | Ensure backwards compatibility |
| Learning curve | Medium | Low | Good documentation, tooltips |
| Feature gaps | Low | High | Ensure feature parity before launch |

### Timeline Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Scope creep | High | Medium | Stick to plan, defer nice-to-haves |
| Underestimated complexity | Medium | Medium | Buffer time in phases |
| Dependency on external APIs | Low | High | Mock APIs for development |

---

## Maintenance & Future Roadmap

### Post-Launch Maintenance

**Regular Tasks:**
- Dependency updates (monthly)
- Security patches (as needed)
- Bug fixes (ongoing)
- Performance monitoring (weekly)
- User support (ongoing)

**Quarterly Reviews:**
- Performance metrics
- User feedback analysis
- Security audit
- Feature prioritization

### Future Enhancements (Post v2.0)

**Phase 17: Advanced Features**
- [ ] Bitbucket support
- [ ] SVN support
- [ ] Compare two repos
- [ ] Diff view between versions
- [ ] Syntax highlighting in output
- [ ] Custom output templates
- [ ] API endpoints (optional)

**Phase 18: Collaboration Features**
- [ ] Share generated prompts (unique URL)
- [ ] Team workspaces
- [ ] Saved configurations
- [ ] Custom filters library

**Phase 19: AI Integration**
- [ ] Smart file selection (ML-based)
- [ ] Suggest relevant files for common tasks
- [ ] Auto-generate .gitignore patterns
- [ ] Prompt optimization suggestions

**Phase 20: Extensions**
- [ ] Chrome extension (PR #16)
- [ ] VS Code extension
- [ ] GitHub CLI tool
- [ ] Desktop app (Electron/Tauri)

---

## Appendix

### A. Key Technologies Reference

**React 18 Features Used:**
- Concurrent rendering
- Suspense for code splitting
- useTransition for non-blocking updates
- useDeferredValue for expensive renders

**TypeScript Patterns:**
- Strict mode
- Discriminated unions for provider types
- Generic constraints for flexibility
- Type guards for runtime safety

**Performance Optimizations:**
- React.memo for expensive components
- useMemo for expensive computations
- useCallback for stable function refs
- Virtual scrolling (react-window)
- Web Workers for heavy operations
- Code splitting by route/provider

**Accessibility:**
- Semantic HTML
- ARIA labels and roles
- Keyboard navigation
- Focus management
- Screen reader testing

### B. Development Commands

```bash
# Development
npm run dev              # Start dev server
npm run dev:debug        # Start with source maps

# Testing
npm run test            # Run all tests
npm run test:unit       # Unit tests only
npm run test:integration # Integration tests
npm run test:e2e        # E2E tests
npm run test:watch      # Watch mode
npm run test:coverage   # Coverage report

# Building
npm run build           # Production build
npm run build:analyze   # Bundle analysis
npm run preview         # Preview production build

# Code Quality
npm run lint            # ESLint
npm run lint:fix        # Auto-fix issues
npm run format          # Prettier
npm run typecheck       # TypeScript check

# CI/CD
npm run ci              # Full CI pipeline locally
npm run deploy:beta     # Deploy to beta
npm run deploy:prod     # Deploy to production
```

### C. Environment Variables

```bash
# .env.example
VITE_GITHUB_API_URL=https://api.github.com
VITE_GITLAB_API_URL=https://gitlab.com/api/v4
VITE_AZURE_API_URL=https://dev.azure.com
VITE_ENABLE_ANALYTICS=false
VITE_ANALYTICS_ID=
VITE_SENTRY_DSN=
```

### D. Browser Support

| Browser | Minimum Version | Features |
|---------|-----------------|----------|
| Chrome | 90+ | All |
| Firefox | 88+ | All |
| Safari | 14+ | All |
| Edge | 90+ | All |
| Mobile Chrome | 90+ | All |
| Mobile Safari | 14+ | All |

### E. License

MIT License (maintained from original project)

---

## Conclusion

This implementation plan provides a comprehensive roadmap for rebuilding repo2txt with modern architecture, fixing all critical issues, and implementing all requested features. The phased approach allows for:

1. **Incremental Development** - Build and test piece by piece
2. **Risk Mitigation** - Thorough testing at each phase
3. **Flexibility** - Adjust priorities as needed
4. **Quality Assurance** - No compromise on code quality
5. **User Safety** - Beta testing before full rollout

The new architecture will make the codebase:
- **Maintainable** - Clear structure, TypeScript safety
- **Extensible** - Easy to add new providers
- **Performant** - Optimized for large repos
- **Secure** - Fixes all security vulnerabilities
- **Testable** - High test coverage

With this plan, repo2txt will be well-positioned for future growth while maintaining the simplicity and privacy that users love.

---

**Document Version:** 1.0
**Last Updated:** 2026-02-16
**Status:** Ready for Implementation
