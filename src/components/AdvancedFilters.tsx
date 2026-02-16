/**
 * Advanced Filters component
 * Wraps Extension Filter and Gitignore Editor in a collapsible container
 */

import { useState } from 'react';
import { ExtensionFilter } from './filters/ExtensionFilter';
import { GitIgnoreEditor } from './filters/GitIgnoreEditor';
import type { ExtensionFilter as ExtensionFilterType } from '@/types';

interface AdvancedFiltersProps {
  // Extension filter props
  extensions: ExtensionFilterType[];
  onExtensionToggle?: (extension: string) => void;
  onSelectAllExtensions?: () => void;
  onDeselectAllExtensions?: () => void;

  // Gitignore editor props
  gitignorePatterns: string[];
  onApplyGitignore?: (patterns: string[]) => void;
  onResetGitignore?: () => void;
  showExcluded?: boolean;
  onToggleExcluded?: (show: boolean) => void;
}

export function AdvancedFilters({
  extensions,
  onExtensionToggle,
  onSelectAllExtensions,
  onDeselectAllExtensions,
  gitignorePatterns,
  onApplyGitignore,
  onResetGitignore,
  showExcluded,
  onToggleExcluded,
}: AdvancedFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Advanced Filters
          </h3>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Extension & Gitignore
          </span>
        </div>
        <svg
          className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform ${
            isExpanded ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Extension Filter */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                File Extensions
              </h4>
              <ExtensionFilter
                extensions={extensions}
                onToggle={onExtensionToggle}
                onSelectAll={onSelectAllExtensions}
                onDeselectAll={onDeselectAllExtensions}
              />
            </div>

            {/* Gitignore Patterns */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Gitignore Patterns
              </h4>
              <GitIgnoreEditor
                patterns={gitignorePatterns}
                onApply={onApplyGitignore}
                onReset={onResetGitignore}
                showExcluded={showExcluded}
                onToggleExcluded={onToggleExcluded}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
