/**
 * Advanced Filters component
 * Wraps Extension Filter and Gitignore Editor in a collapsible container
 */

import { useState } from 'react';
import { ExtensionFilter } from './filters/ExtensionFilter';
import { GitIgnoreEditor } from './filters/GitIgnoreEditor';
import { Panel } from './ui/Panel';
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
    <Panel className="overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60"
      >
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Filters</h3>
        <div className="flex items-center gap-3">
          <span className="tabular-nums text-xs text-gray-500 dark:text-gray-400">
            {extensions.length} types · {gitignorePatterns.length} patterns
          </span>
          <svg
            className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="grid grid-cols-1 divide-y divide-gray-200 border-t border-gray-200 dark:divide-gray-800 dark:border-gray-800 lg:grid-cols-2 lg:divide-x lg:divide-y-0">
          {/* Extension Filter */}
          <div className="space-y-3 p-3 sm:p-4">
            <h4 className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Extensions
            </h4>
            <ExtensionFilter
              extensions={extensions}
              onToggle={onExtensionToggle}
              onSelectAll={onSelectAllExtensions}
              onDeselectAll={onDeselectAllExtensions}
            />
          </div>

          {/* Gitignore Patterns */}
          <div className="space-y-3 p-3 sm:p-4">
            <h4 className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Ignore patterns
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
      )}
    </Panel>
  );
}
