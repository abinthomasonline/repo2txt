/**
 * Provider selector component
 * Allows switching between GitHub and Local providers
 */

import { lazy, Suspense, useState } from 'react';
import { GitHubForm } from '@/features/github/components/GitHubForm';
import { Panel } from '@/components/ui/Panel';
import type { ProviderType } from '@/types';

const LocalForm = lazy(() =>
  import('@/features/local/components/LocalForm').then((module) => ({
    default: module.LocalForm,
  }))
);
const GitLabForm = lazy(() =>
  import('@/features/gitlab/components/GitLabForm').then((module) => ({
    default: module.GitLabForm,
  }))
);
const AzureForm = lazy(() =>
  import('@/features/azure/components/AzureForm').then((module) => ({
    default: module.AzureForm,
  }))
);

const PROVIDERS: Array<{
  id: ProviderType;
  label: string;
  beta?: boolean;
  icon: React.ReactNode;
}> = [
  {
    id: 'github',
    label: 'GitHub',
    icon: (
      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
      </svg>
    ),
  },
  {
    id: 'local',
    label: 'Local',
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
        />
      </svg>
    ),
  },
  {
    id: 'gitlab',
    label: 'GitLab',
    beta: true,
    icon: (
      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M23.6 9.593l-.033-.086L20.3.98a.851.851 0 00-.336-.405.875.875 0 00-1.056.095c-.139.127-.24.296-.289.485l-2.224 6.827H7.617L5.393 1.165a.857.857 0 00-.29-.485.875.875 0 00-1.055-.095.857.857 0 00-.336.405L.443 9.502l-.032.086a6.066 6.066 0 002.012 7.01l.01.008.03.022 4.977 3.727 2.462 1.862 1.5 1.132a1.008 1.008 0 001.22 0l1.499-1.132 2.461-1.862 5.006-3.75.01-.008a6.068 6.068 0 002.012-7.004z" />
      </svg>
    ),
  },
  {
    id: 'azure',
    label: 'Azure',
    beta: true,
    icon: (
      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M11.19 14.23l-3.47-1.85v-2.7l7.95-4.24v2.27l-5.94 3.17v.94l5.94 3.17v2.27l-7.95-4.24 3.47 1.85zm1.62 0l3.47-1.85v-2.7l-7.95-4.24v2.27l5.94 3.17v.94l-5.94 3.17v2.27l7.95-4.24-3.47 1.85z" />
      </svg>
    ),
  },
];

function ProviderFormFallback() {
  return (
    <div
      className="flex min-h-32 items-center justify-center text-sm text-gray-500 dark:text-gray-400"
      role="status"
    >
      Loading converter…
    </div>
  );
}

interface ProviderSelectorProps {
  onGitHubSubmit?: (url: string) => void;
  onGitLabSubmit?: (url: string) => void;
  onAzureSubmit?: (url: string) => void;
  onLocalDirectorySubmit?: (files: FileList) => void;
  onLocalZipSubmit?: (file: File) => void;
  onProviderChange?: (provider: ProviderType) => void;
  disabled?: boolean;
}

export function ProviderSelector({
  onGitHubSubmit,
  onGitLabSubmit,
  onAzureSubmit,
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
    <div className="space-y-3">
      {/* Provider tabs */}
      <div
        role="tablist"
        aria-label="Source"
        className="grid grid-cols-2 gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800/70 sm:flex"
      >
        {PROVIDERS.map((provider) => {
          const isActive = activeProvider === provider.id;

          return (
            <button
              key={provider.id}
              role="tab"
              id={`provider-tab-${provider.id}`}
              aria-selected={isActive}
              aria-controls="provider-panel"
              onClick={() => handleProviderChange(provider.id)}
              disabled={disabled}
              data-testid={`provider-tab-${provider.id}`}
              className={`
                flex min-h-[40px] flex-1 touch-manipulation items-center justify-center gap-2 rounded-md px-2 text-sm font-medium transition-colors sm:px-4
                ${
                  isActive
                    ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100'
                    : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
                }
                ${disabled ? 'cursor-not-allowed opacity-50' : ''}
              `}
            >
              {provider.icon}
              <span>{provider.label}</span>
              {provider.beta && (
                <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-500">
                  beta
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Provider form */}
      <Panel
        id="provider-panel"
        role="tabpanel"
        aria-labelledby={`provider-tab-${activeProvider}`}
        className="p-4 sm:p-5"
      >
        <Suspense fallback={<ProviderFormFallback />}>
          {activeProvider === 'github' ? (
            <GitHubForm onSubmit={onGitHubSubmit} disabled={disabled} />
          ) : activeProvider === 'local' ? (
            <LocalForm
              onDirectorySelected={onLocalDirectorySubmit}
              onZipSelected={onLocalZipSubmit}
              onTabChange={() => onProviderChange?.('local')}
              disabled={disabled}
            />
          ) : activeProvider === 'gitlab' ? (
            <GitLabForm onSubmit={onGitLabSubmit} disabled={disabled} />
          ) : (
            <AzureForm onSubmit={onAzureSubmit} disabled={disabled} />
          )}
        </Suspense>
      </Panel>
    </div>
  );
}
