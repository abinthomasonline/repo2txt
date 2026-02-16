/**
 * GitLab authentication component
 * Handles Personal Access Token input with secure storage
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { useStore } from '@/store';

export function GitLabAuth() {
  const { setCredentials } = useStore();
  const [token, setToken] = useState('');
  const [showInfo, setShowInfo] = useState(false);

  // Load saved token on mount
  useEffect(() => {
    const savedToken = sessionStorage.getItem('provider_token');
    if (savedToken) {
      setToken(savedToken);
      setCredentials({ token: savedToken });
    }
  }, [setCredentials]);

  const handleTokenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newToken = e.target.value;
    setToken(newToken);

    // Save to sessionStorage and store
    if (newToken) {
      sessionStorage.setItem('provider_token', newToken);
      setCredentials({ token: newToken });
    } else {
      sessionStorage.removeItem('provider_token');
      setCredentials({ token: undefined });
    }
  };

  const handleClearToken = () => {
    setToken('');
    sessionStorage.removeItem('provider_token');
    setCredentials({ token: undefined });
  };

  return (
    <div className="space-y-2">
      <label
        htmlFor="gitlab-token"
        className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        Personal Access Token
        <span className="ml-1 text-gray-500 dark:text-gray-400">(optional)</span>
        <button
          type="button"
          onClick={() => setShowInfo(!showInfo)}
          className="ml-2 text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
          aria-label="Toggle token information"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            {showInfo ? (
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

      {showInfo && (
        <div className="rounded-md bg-blue-50 dark:bg-blue-900/20 p-3 text-sm">
          <p className="text-blue-800 dark:text-blue-200 mb-2">
            A token is required for private repositories and increases rate limits.
          </p>
          <p className="text-blue-700 dark:text-blue-300 mb-3">
            Your token needs <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">read_api</code> and{' '}
            <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">read_repository</code> scopes.
          </p>
          <p className="text-blue-700 dark:text-blue-300 mb-2">
            Your token is stored securely in your browser session and never sent to any server.
          </p>
          <a
            href="https://gitlab.com/-/profile/personal_access_tokens"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
          >
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
              <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
            </svg>
            Create your token
          </a>
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="password"
          id="gitlab-token"
          value={token}
          onChange={handleTokenChange}
          placeholder="glpat-xxxxxxxxxxxxxxxxxxxx"
          className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400"
        />
        {token && (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleClearToken}
            title="Clear token"
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
      </div>

      {token && (
        <p className="text-xs text-green-600 dark:text-green-400 flex items-center">
          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          Token saved (session only)
        </p>
      )}
    </div>
  );
}
