/**
 * Provider selector component
 * Allows switching between GitHub and Local providers
 */

import { useState } from 'react';
import { GitHubForm } from '@/features/github';
import { LocalForm } from '@/features/local';
import type { ProviderType } from '@/types';

interface ProviderSelectorProps {
  onGitHubSubmit?: (url: string) => void;
  onLocalDirectorySubmit?: (files: FileList) => void;
  onLocalZipSubmit?: (file: File) => void;
  onProviderChange?: (provider: ProviderType) => void;
  disabled?: boolean;
}

export function ProviderSelector({
  onGitHubSubmit,
  onLocalDirectorySubmit,
  onLocalZipSubmit,
  onProviderChange,
  disabled = false,
}: ProviderSelectorProps) {
  const [activeProvider, setActiveProvider] = useState<ProviderType>('github');

  const handleProviderChange = (provider: ProviderType) => {
    if (provider !== activeProvider) {
      setActiveProvider(provider);
      onProviderChange?.(provider);
    }
  };

  return (
    <div className="space-y-4">
      {/* Provider tabs */}
      <div className="flex space-x-1 rounded-lg bg-gray-100 dark:bg-gray-800 p-1">
        <button
          onClick={() => handleProviderChange('github')}
          disabled={disabled}
          className={`
            flex-1 flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-colors
            ${
              activeProvider === 'github'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
          </svg>
          GitHub
        </button>

        <button
          onClick={() => handleProviderChange('local')}
          disabled={disabled}
          className={`
            flex-1 flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-colors
            ${
              activeProvider === 'local'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
            />
          </svg>
          Local
        </button>
      </div>

      {/* Provider form */}
      <div className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
        {activeProvider === 'github' ? (
          <GitHubForm onSubmit={onGitHubSubmit} disabled={disabled} />
        ) : (
          <LocalForm
            onDirectorySelected={onLocalDirectorySubmit}
            onZipSelected={onLocalZipSubmit}
            onTabChange={() => onProviderChange?.('local')}
            disabled={disabled}
          />
        )}
      </div>
    </div>
  );
}
