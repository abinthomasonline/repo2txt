/**
 * GitHub URL input component
 * Provides real-time URL validation and helpful hints
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { useStore } from '@/store';
import { GitHubProvider } from '../GitHubProvider';

interface GitHubUrlInputProps {
  onValidUrl?: (url: string) => void;
}

export function GitHubUrlInput({ onValidUrl }: GitHubUrlInputProps) {
  const { repoUrl, setRepoUrl } = useStore();
  const [url, setUrl] = useState(repoUrl || '');
  const [error, setError] = useState<string | null>(null);
  const [isValid, setIsValid] = useState(false);
  const [showHints, setShowHints] = useState(false);

  const provider = new GitHubProvider();

  // Validate URL whenever it changes
  useEffect(() => {
    if (!url) {
      setError(null);
      setIsValid(false);
      return;
    }

    const isValidUrl = provider.validateUrl(url);
    setIsValid(isValidUrl);

    if (isValidUrl) {
      setError(null);
      setRepoUrl(url);
    } else {
      setError('Invalid GitHub URL format');
    }
  }, [url, setRepoUrl, provider]);

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    setUrl(newUrl);
  };

  const handleClearUrl = () => {
    setUrl('');
    setRepoUrl('');
    setError(null);
    setIsValid(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValid && onValidUrl) {
      onValidUrl(url);
    }
  };

  return (
    <div className="space-y-2">
      <label
        htmlFor="github-url"
        className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        Repository URL
        <button
          type="button"
          onClick={() => setShowHints(!showHints)}
          className="ml-2 text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
          aria-label="Toggle URL format hints"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            {showHints ? (
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            ) : (
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            )}
          </svg>
        </button>
      </label>

      {showHints && (
        <div className="rounded-md bg-blue-50 dark:bg-blue-900/20 p-3 text-sm space-y-2">
          <p className="text-blue-800 dark:text-blue-200 font-medium">
            Supported URL formats:
          </p>
          <ul className="text-blue-700 dark:text-blue-300 space-y-1 list-disc list-inside">
            <li>
              <code className="text-xs bg-blue-100 dark:bg-blue-800 px-1 py-0.5 rounded">
                https://github.com/owner/repo
              </code>
            </li>
            <li>
              <code className="text-xs bg-blue-100 dark:bg-blue-800 px-1 py-0.5 rounded">
                https://github.com/owner/repo/tree/branch
              </code>
            </li>
            <li>
              <code className="text-xs bg-blue-100 dark:bg-blue-800 px-1 py-0.5 rounded">
                https://github.com/owner/repo/tree/branch/path/to/folder
              </code>
            </li>
          </ul>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="flex-1">
          <input
            type="url"
            id="github-url"
            value={url}
            onChange={handleUrlChange}
            placeholder="https://github.com/facebook/react"
            className={`w-full rounded-md border ${
              error
                ? 'border-red-300 dark:border-red-600 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-300 dark:border-gray-600 focus:border-primary-500 focus:ring-primary-500'
            } bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 dark:focus:ring-primary-400`}
            aria-invalid={!!error}
            aria-describedby={error ? 'url-error' : undefined}
          />
          {error && (
            <p id="url-error" className="mt-1 text-xs text-red-600 dark:text-red-400 flex items-center">
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              {error}
            </p>
          )}
          {isValid && !error && (
            <p className="mt-1 text-xs text-green-600 dark:text-green-400 flex items-center">
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              Valid GitHub URL
            </p>
          )}
        </div>
        {url && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleClearUrl}
            title="Clear URL"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </Button>
        )}
      </form>
    </div>
  );
}
