import { useState, useCallback } from 'react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { ProviderSelector } from '@/components/ProviderSelector';
import { FileTree } from '@/components/file-tree';
import { ExtensionFilter } from '@/components/filters/ExtensionFilter';
import { GitIgnoreEditor } from '@/components/filters/GitIgnoreEditor';
import { OutputPanel } from '@/components/OutputPanel';
import { GitHubProvider } from '@/features/github';
import { LocalProvider } from '@/features/local';
import { FileTree as FileTreeManager } from '@/lib/file-tree/FileTree';
import { Formatter } from '@/lib/formatter';
import { useStore } from '@/store';
import type { TreeNode, FileNode, FileContent, ExtensionFilter as ExtensionFilterType, FormattedOutput } from '@/types';

function App() {
  const { setProviderType, setRepoUrl } = useStore();

  // State
  const [isLoading, setIsLoading] = useState(false);
  const [treeNodes, setTreeNodes] = useState<TreeNode[]>([]);
  const [fileTreeManager, setFileTreeManager] = useState<FileTreeManager | null>(null);
  const [extensions, setExtensions] = useState<ExtensionFilterType[]>([]);
  const [gitignorePatterns, setGitignorePatterns] = useState<string[]>([]);
  const [showExcluded, setShowExcluded] = useState(false);
  const [output, setOutput] = useState<FormattedOutput | null>(null);
  const [currentProvider, setCurrentProvider] = useState<GitHubProvider | LocalProvider | null>(null);

  // Load files from provider
  const loadFiles = useCallback(async (provider: GitHubProvider | LocalProvider, url: string) => {
    try {
      setIsLoading(true);
      setCurrentProvider(provider);

      // Fetch file tree
      const nodes = await provider.fetchTree(url);

      // Create FileTree manager
      const manager = new FileTreeManager(nodes);

      // Get available extensions
      const extensionMap = manager.getExtensions();
      const extensionList: ExtensionFilterType[] = Array.from(extensionMap.entries()).map(
        ([ext, count]) => ({
          extension: ext,
          count,
          selected: true, // All selected by default
        })
      );

      setFileTreeManager(manager);
      setTreeNodes(manager.buildTree());
      setExtensions(extensionList);
    } catch (error) {
      console.error('Failed to load files:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Failed to load files'}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle GitHub submission
  const handleGitHubSubmit = useCallback(async (url: string) => {
    setProviderType('github');
    setRepoUrl(url);

    const provider = new GitHubProvider();
    // Get token from sessionStorage if available
    const token = sessionStorage.getItem('provider_token');
    if (token) {
      provider.setCredentials({ token });
    }

    await loadFiles(provider, url);
  }, [loadFiles, setProviderType, setRepoUrl]);

  // Handle local directory submission
  const handleLocalDirectorySubmit = useCallback(async (files: FileList) => {
    setProviderType('local');

    const provider = new LocalProvider();
    await provider.initialize({ source: 'directory', files });

    await loadFiles(provider, 'local://directory');
  }, [loadFiles, setProviderType]);

  // Handle local zip submission
  const handleLocalZipSubmit = useCallback(async (file: File) => {
    setProviderType('local');

    const provider = new LocalProvider();
    await provider.initialize({ source: 'zip', zipFile: file });

    await loadFiles(provider, 'local://zip');
  }, [loadFiles, setProviderType]);

  // Handle extension filter toggle
  const handleExtensionToggle = useCallback((extension: string) => {
    setExtensions((prev) =>
      prev.map((ext) =>
        ext.extension === extension ? { ...ext, selected: !ext.selected } : ext
      )
    );
  }, []);

  // Handle select/deselect all extensions
  const handleSelectAllExtensions = useCallback(() => {
    setExtensions((prev) => prev.map((ext) => ({ ...ext, selected: true })));
  }, []);

  const handleDeselectAllExtensions = useCallback(() => {
    setExtensions((prev) => prev.map((ext) => ({ ...ext, selected: false })));
  }, []);

  // Handle gitignore pattern application
  const handleApplyGitignore = useCallback((patterns: string[]) => {
    setGitignorePatterns(patterns);
  }, []);

  // Handle generate output
  const handleGenerateOutput = useCallback(async () => {
    if (!fileTreeManager || !currentProvider) return;

    try {
      setIsLoading(true);

      // Apply filters
      const selectedExtensions = extensions
        .filter((ext) => ext.selected)
        .map((ext) => ext.extension);

      let filteredTree = fileTreeManager.clone();

      // Apply extension filter
      if (selectedExtensions.length > 0) {
        filteredTree = filteredTree.filterByExtension(selectedExtensions);
      }

      // Apply gitignore
      if (gitignorePatterns.length > 0) {
        filteredTree = filteredTree.applyGitignore(gitignorePatterns);
      }

      // Get selected nodes
      const selectedNodes: FileNode[] = Array.from(filteredTree.nodes.values())
        .filter((node) => node.type === 'blob' && node.visible !== false);

      // Fetch file contents
      const fileContents: FileContent[] = [];
      for await (const content of currentProvider.fetchMultiple(selectedNodes)) {
        fileContents.push(content);
      }

      // Format output
      const formattedOutput = Formatter.format(filteredTree.buildTree(), fileContents);

      setOutput(formattedOutput);
    } catch (error) {
      console.error('Failed to generate output:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Failed to generate output'}`);
    } finally {
      setIsLoading(false);
    }
  }, [fileTreeManager, currentProvider, extensions, gitignorePatterns]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              repo2txt
            </h1>
            <span className="rounded-full bg-primary-100 dark:bg-primary-900 px-2 py-0.5 text-xs font-semibold text-primary-700 dark:text-primary-300">
              v2.0 Beta
            </span>
          </div>

          <div className="flex items-center gap-4">
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

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Provider Selection */}
          <section>
            <ProviderSelector
              onGitHubSubmit={handleGitHubSubmit}
              onLocalDirectorySubmit={handleLocalDirectorySubmit}
              onLocalZipSubmit={handleLocalZipSubmit}
              disabled={isLoading}
            />
          </section>

          {/* File Tree and Filters */}
          {treeNodes.length > 0 && (
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* File Tree */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    File Tree
                  </h2>
                  <button
                    onClick={handleGenerateOutput}
                    disabled={isLoading}
                    className="inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary-600 text-white hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 h-10 px-4 text-sm"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Generate Output
                  </button>
                </div>

                <FileTree nodes={treeNodes} showExcluded={showExcluded} />
              </div>

              {/* Filters */}
              <div className="space-y-6">
                <div className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
                  <ExtensionFilter
                    extensions={extensions}
                    onToggle={handleExtensionToggle}
                    onSelectAll={handleSelectAllExtensions}
                    onDeselectAll={handleDeselectAllExtensions}
                  />
                </div>

                <div className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
                  <GitIgnoreEditor
                    patterns={gitignorePatterns}
                    onApply={handleApplyGitignore}
                    onReset={() => setGitignorePatterns([])}
                    showExcluded={showExcluded}
                    onToggleExcluded={setShowExcluded}
                  />
                </div>
              </div>
            </section>
          )}

          {/* Output */}
          {(output || isLoading) && (
            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Output
              </h2>
              <OutputPanel output={output} isLoading={isLoading} />
            </section>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 py-6">
        <div className="container mx-auto px-4 text-center text-sm text-gray-600 dark:text-gray-400">
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
    </div>
  );
}

export default App;
