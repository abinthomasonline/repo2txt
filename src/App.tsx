import { ThemeToggle } from '@/components/ui/ThemeToggle';

function App() {
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
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-xl text-gray-600 dark:text-gray-400 mb-4">
              Convert Code Repositories to Plain Text for LLM Prompts
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              GitHub • Local Directories • Zip Files • GitLab • Azure DevOps
            </p>
          </div>

          {/* Placeholder for future components */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 border border-gray-200 dark:border-gray-700">
            <div className="text-center space-y-4">
              <div className="text-6xl">🚧</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Phase 0: Setup Complete!
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Project infrastructure is ready. Next: Implementing core features.
              </p>
              <div className="pt-4 text-left">
                <h4 className="font-semibold mb-2 text-gray-900 dark:text-gray-100">
                  ✅ Completed:
                </h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 dark:text-gray-300">
                  <li>Vite + React + TypeScript setup</li>
                  <li>TailwindCSS with dark mode</li>
                  <li>Testing infrastructure (Vitest + Playwright)</li>
                  <li>ESLint + Prettier configuration</li>
                  <li>Project structure created</li>
                  <li>Zustand store with theme management</li>
                  <li>Basic UI components</li>
                </ul>
              </div>
            </div>
          </div>
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
