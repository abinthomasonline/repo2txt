import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { ErrorDialog } from '@/components/ui/ErrorDialog';
import { ProviderSelector } from '@/components/ProviderSelector';
import { AdvancedFilters } from '@/components/AdvancedFilters';
import { FileTree } from '@/components/file-tree';
import { OutputPanel } from '@/components/OutputPanel';
import { ProviderError } from '@/lib/providers/types';
import { GitHubProvider } from '@/features/github';
import { Formatter } from '@/lib/formatter';
import { buildTree, extractDirectories } from '@/lib/tree-builder';
import {
  extractGitHubRepoName,
  extractGitLabRepoName,
  extractAzureRepoName,
  extractLocalName,
} from '@/lib/utils/repoName';
import { useStore } from '@/store';
import type { FileNode, FileContent, ExtensionFilter as ExtensionFilterType, FormattedOutput } from '@/types';
import type { IProvider } from '@/lib/providers/types';

function App() {
  const { setProviderType, setRepoUrl } = useStore();

  // Get file tree state from store
  const {
    nodes,
    selectedPaths,
    excludedPaths,
    expandedPaths,
    extensions,
    gitignorePatterns,
    setNodes,
    setTree,
    toggleSelection,
    toggleExpanded,
    toggleExtension,
    setGitignorePatterns,
    getSelectedNodes,
    getDirectorySelectionState,
    getExtensionSelectionState,
    getGlobalSelectionState,
    selectAll,
    deselectAll,
  } = useStore((state) => state);

  // Local state
  const [isLoading, setIsLoading] = useState(false);
  const [showExcluded, setShowExcluded] = useState(false);
  const [output, setOutput] = useState<FormattedOutput | null>(null);
  const [currentProvider, setCurrentProvider] = useState<IProvider | null>(null);
  const [repoName, setRepoName] = useState<string>('repo-export');
  const [error, setError] = useState<{ message: string; recovery?: () => void; recoveryLabel?: string } | null>(null);
  const shouldAutoExpandRoot = useRef(false);
  const outputRef = useRef<HTMLDivElement>(null);

  // Build tree from nodes with current selection/expansion state
  const tree = useMemo(() => {
    if (nodes.length === 0) return [];

    // Extract directory paths that don't already exist as nodes
    const existingPaths = new Set(nodes.map((n) => n.path));
    const dirPaths = extractDirectories(nodes);
    const newDirNodes = dirPaths
      .filter((path) => !existingPaths.has(path))
      .map((path) => ({
        path,
        type: 'tree' as const,
      }));

    const allNodes: FileNode[] = [...nodes, ...newDirNodes];

    return buildTree(allNodes, {
      selectedPaths,
      excludedPaths,
      expandedPaths,
      getDirectorySelectionState,
    });
  }, [nodes, selectedPaths, excludedPaths, expandedPaths, getDirectorySelectionState]);

  // Convert extensions map to array for ExtensionFilter component
  const extensionList: ExtensionFilterType[] = useMemo(() => {
    return Array.from(extensions.entries()).map(([ext, data]) => {
      const state = getExtensionSelectionState(ext);
      return {
        extension: ext,
        count: data.count,
        selected: state === 'checked',
        indeterminate: state === 'indeterminate',
      };
    });
  }, [extensions, getExtensionSelectionState]);

  // Reset all state (store + local)
  const resetAll = useCallback(() => {
    // Clear store state using setter functions
    setNodes([]);
    setTree([]);
    setGitignorePatterns([]);

    // Clear local state
    setOutput(null);
    setCurrentProvider(null);
    setShowExcluded(false);
  }, [setNodes, setTree, setGitignorePatterns]);

  // Auto-expand root directories for local directory uploads
  useEffect(() => {
    if (shouldAutoExpandRoot.current && tree.length > 0) {
      shouldAutoExpandRoot.current = false;
      // Expand all root-level directories
      tree.forEach((node) => {
        if (node.type === 'directory') {
          toggleExpanded(node.path);
        }
      });
    }
  }, [tree, toggleExpanded]);

  // Load files from provider
  const loadFiles = useCallback(async (provider: IProvider, url: string) => {
    try {
      setIsLoading(true);
      setCurrentProvider(provider);

      // Fetch file tree
      const fetchedNodes = await provider.fetchTree(url);

      // Update store with nodes (this will auto-select code files)
      setNodes(fetchedNodes);
    } catch (err) {
      console.error('Failed to load files:', err);

      if (err instanceof ProviderError) {
        setError({
          message: err.userMessage,
          recovery: err.recovery,
          recoveryLabel: err.recovery ? 'Create GitHub Token' : undefined,
        });
      } else {
        setError({
          message: err instanceof Error ? err.message : 'Failed to load files. Please try again.',
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [setNodes]);

  // Handle GitHub submission
  const handleGitHubSubmit = useCallback(async (url: string) => {
    setProviderType('github');
    setRepoUrl(url);
    setRepoName(extractGitHubRepoName(url));

    const provider = new GitHubProvider();
    // Get GitHub token from sessionStorage if available
    const token = sessionStorage.getItem('github_token');
    if (token) {
      provider.setCredentials({ token });
    }

    await loadFiles(provider, url);
  }, [loadFiles, setProviderType, setRepoUrl]);

  // Handle GitLab submission
  const handleGitLabSubmit = useCallback(async (url: string) => {
    setProviderType('gitlab');
    setRepoUrl(url);
    setRepoName(extractGitLabRepoName(url));

    // Dynamically import GitLab provider (code splitting)
    const { GitLabProvider } = await import('@/features/gitlab');
    const provider = new GitLabProvider();
    // Get GitLab token from sessionStorage if available
    const token = sessionStorage.getItem('gitlab_token');
    if (token) {
      provider.setCredentials({ token });
    }

    await loadFiles(provider, url);
  }, [loadFiles, setProviderType, setRepoUrl]);

  // Handle Azure DevOps submission
  const handleAzureSubmit = useCallback(async (url: string) => {
    setProviderType('azure');
    setRepoUrl(url);
    setRepoName(extractAzureRepoName(url));

    // Dynamically import Azure provider (code splitting)
    const { AzureDevOpsProvider } = await import('@/features/azure');
    const provider = new AzureDevOpsProvider();
    // Get Azure token from sessionStorage if available
    const token = sessionStorage.getItem('azure_token');
    if (token) {
      provider.setCredentials({ token });
    }

    await loadFiles(provider, url);
  }, [loadFiles, setProviderType, setRepoUrl]);

  // Handle local directory submission
  const handleLocalDirectorySubmit = useCallback(async (files: FileList) => {
    setProviderType('local');
    setRepoName(extractLocalName(files));

    // Dynamically import Local provider (code splitting)
    const { LocalProvider } = await import('@/features/local');
    const provider = new LocalProvider();
    await provider.initialize({ source: 'directory', files });

    // Set flag to auto-expand root after tree is built
    shouldAutoExpandRoot.current = true;

    await loadFiles(provider, 'local://directory');
  }, [loadFiles, setProviderType]);

  // Handle local zip submission
  const handleLocalZipSubmit = useCallback(async (file: File) => {
    setProviderType('local');
    setRepoName(extractLocalName(file));

    // Dynamically import Local provider (code splitting)
    const { LocalProvider } = await import('@/features/local');
    const provider = new LocalProvider();
    await provider.initialize({ source: 'zip', zipFile: file });

    await loadFiles(provider, 'local://zip');
  }, [loadFiles, setProviderType]);

  // Handle extension filter toggle
  const handleExtensionToggle = useCallback((extension: string) => {
    toggleExtension(extension);
  }, [toggleExtension]);

  // Handle select/deselect all extensions
  const handleSelectAllExtensions = useCallback(() => {
    extensionList.forEach((ext) => {
      if (!ext.selected) {
        toggleExtension(ext.extension);
      }
    });
  }, [extensionList, toggleExtension]);

  const handleDeselectAllExtensions = useCallback(() => {
    extensionList.forEach((ext) => {
      if (ext.selected) {
        toggleExtension(ext.extension);
      }
    });
  }, [extensionList, toggleExtension]);

  // Handle gitignore pattern application
  const handleApplyGitignore = useCallback((patterns: string[]) => {
    setGitignorePatterns(patterns);
  }, [setGitignorePatterns]);

  // Handle global checkbox toggle
  const handleGlobalToggle = useCallback(() => {
    const state = getGlobalSelectionState();
    if (state === 'checked') {
      deselectAll();
    } else {
      selectAll();
    }
  }, [getGlobalSelectionState, selectAll, deselectAll]);

  // Get global checkbox state
  const globalCheckboxState = useMemo(() => {
    return getGlobalSelectionState();
  }, [selectedPaths, nodes, getGlobalSelectionState]);

  // Handle generate output
  const handleGenerateOutput = useCallback(async () => {
    if (!currentProvider) return;

    try {
      setIsLoading(true);

      // Get selected and non-excluded nodes from store
      const selectedNodes = getSelectedNodes();

      if (selectedNodes.length === 0) {
        setError({
          message: 'No files selected.\n\nPlease select at least one file to generate output. You can:\n• Click the checkbox next to "File Tree" to select all files\n• Expand directories and select individual files\n• Use the Extension Filter to select files by type',
        });
        return;
      }

      // Fetch file contents
      const fileContents: FileContent[] = [];
      for await (const content of currentProvider.fetchMultiple(selectedNodes)) {
        fileContents.push(content);
      }

      // Build a fully expanded tree for output (ignore UI expansion state)
      const existingPaths = new Set(nodes.map((n) => n.path));
      const dirPaths = extractDirectories(nodes);
      const newDirNodes = dirPaths
        .filter((path) => !existingPaths.has(path))
        .map((path) => ({
          path,
          type: 'tree' as const,
        }));
      let allNodes: FileNode[] = [...nodes, ...newDirNodes];

      // Filter out excluded files and directories if showExcluded is false
      if (!showExcluded) {
        allNodes = allNodes.filter((n) => !excludedPaths.has(n.path));
      }

      // Build tree with all directories expanded (pass all paths as expanded)
      const allDirPaths = new Set(allNodes.filter(n => n.type === 'tree').map(n => n.path));
      const fullTree = buildTree(allNodes, {
        selectedPaths,
        excludedPaths: showExcluded ? excludedPaths : new Set(), // Clear excluded paths if not showing them
        expandedPaths: allDirPaths, // All directories expanded for output
        getDirectorySelectionState,
      });

      // Format output with full tree (using async Web Worker for better performance)
      const formattedOutput = await Formatter.formatAsync(
        fullTree,
        fileContents,
        (progress, current, total) => {
          // Progress callback - could show progress UI here
          console.log(`Tokenizing: ${current}/${total} files (${progress.toFixed(1)}%)`);
        }
      );

      setOutput(formattedOutput);

      // Scroll to output section after a brief delay to ensure rendering
      setTimeout(() => {
        outputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (err) {
      console.error('Failed to generate output:', err);

      if (err instanceof ProviderError) {
        setError({
          message: err.userMessage,
          recovery: err.recovery,
          recoveryLabel: err.recovery ? 'Create GitHub Token' : undefined,
        });
      } else {
        setError({
          message: err instanceof Error ? err.message : 'Failed to generate output. Please try again.',
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentProvider, getSelectedNodes, nodes, selectedPaths, excludedPaths, getDirectorySelectionState]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="container mx-auto flex h-14 sm:h-16 items-center justify-between px-3 sm:px-4 lg:px-6">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">
              repo2txt
            </h1>
            <span className="rounded-full bg-primary-100 dark:bg-primary-900 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-semibold text-primary-700 dark:text-primary-300">
              v2.0 Beta
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <ThemeToggle />
            <a
              href="https://github.com/abinthomasonline/repo2txt"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors"
              title="View on GitHub"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path
                  fillRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  clipRule="evenodd"
                />
              </svg>
            </a>
          </div>
        </div>
      </header>

      {/* Project Promotion Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-700 dark:to-purple-700">
        <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-3">
          <a
            href="https://abinthomas.in/forensic-sketch-ai/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 text-white hover:text-blue-100 transition-colors group"
          >
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="text-sm sm:text-base font-medium text-center">
              🎨 Check out <span className="font-bold underline decoration-2 underline-offset-2 group-hover:decoration-blue-200">Forensic Sketch AI</span> - Generate realistic forensic sketches from text descriptions
            </span>
            <svg className="w-4 h-4 flex-shrink-0 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 md:py-8">
        <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 md:space-y-8">
          {/* Provider Selection */}
          <section>
            <ProviderSelector
              onGitHubSubmit={handleGitHubSubmit}
              onGitLabSubmit={handleGitLabSubmit}
              onAzureSubmit={handleAzureSubmit}
              onLocalDirectorySubmit={handleLocalDirectorySubmit}
              onLocalZipSubmit={handleLocalZipSubmit}
              onProviderChange={resetAll}
              disabled={isLoading}
            />
          </section>

          {/* Filters and File Tree */}
          {tree.length > 0 && (
            <section className="space-y-6">
              {/* Advanced Filters - Collapsed by default */}
              <AdvancedFilters
                extensions={extensionList}
                onExtensionToggle={handleExtensionToggle}
                onSelectAllExtensions={handleSelectAllExtensions}
                onDeselectAllExtensions={handleDeselectAllExtensions}
                gitignorePatterns={gitignorePatterns}
                onApplyGitignore={handleApplyGitignore}
                onResetGitignore={() => setGitignorePatterns([])}
                showExcluded={showExcluded}
                onToggleExcluded={setShowExcluded}
              />

              {/* File Tree */}
              <div className="space-y-4" data-testid="file-tree-section">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={globalCheckboxState === 'checked'}
                        ref={(input) => {
                          if (input) {
                            input.indeterminate = globalCheckboxState === 'indeterminate';
                          }
                        }}
                        onChange={handleGlobalToggle}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800"
                        aria-label="Select all files"
                      />
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100" data-testid="file-tree-heading">
                        File Tree
                      </h2>
                    </label>
                  </div>
                  <button
                    onClick={handleGenerateOutput}
                    disabled={isLoading}
                    data-testid="generate-output-button"
                    className="inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary-600 text-white hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 h-11 sm:h-10 px-4 sm:px-6 text-sm min-w-[44px] touch-manipulation"
                  >
                    <svg className="w-4 h-4 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span className="hidden sm:inline">Generate Output</span>
                  </button>
                </div>

                <FileTree
                  nodes={tree}
                  onToggle={toggleExpanded}
                  onSelect={toggleSelection}
                  showExcluded={showExcluded}
                />
              </div>
            </section>
          )}

          {/* Output */}
          {(output || isLoading) && (
            <section ref={outputRef}>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Output
              </h2>
              <OutputPanel output={output} isLoading={isLoading} repoName={repoName} />
            </section>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 py-4 sm:py-6">
        <div className="container mx-auto px-3 sm:px-4 lg:px-6 text-center text-xs sm:text-sm text-gray-600 dark:text-gray-400">
          <p>
            Built with ❤️ by{' '}
            <a
              href="https://github.com/abinthomasonline"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 dark:text-primary-400 hover:underline"
            >
              abinthomasonline
            </a>
          </p>
          <p className="mt-2">
            Open source under MIT License • Privacy-focused • Browser-only
          </p>
        </div>
      </footer>

      {/* Error Dialog */}
      {error && (
        <ErrorDialog
          title="Unable to Complete Request"
          message={error.message}
          onClose={() => setError(null)}
          onAction={error.recovery}
          actionLabel={error.recoveryLabel}
        />
      )}
    </div>
  );
}

export default App;
