/**
 * Extension filter component
 * Allows filtering files by extension
 */

import type { ExtensionFilter as ExtensionFilterType } from '@/types';

interface ExtensionFilterProps {
  extensions: ExtensionFilterType[];
  onToggle?: (extension: string) => void;
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
}

export function ExtensionFilter({
  extensions,
  onToggle,
  onSelectAll,
  onDeselectAll,
}: ExtensionFilterProps) {
  // Partially selected extensions still contribute files to the output
  const includedCount = extensions.filter((e) => e.selected || e.indeterminate).length;
  const totalCount = extensions.length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="tabular-nums text-xs text-gray-500 dark:text-gray-400">
          {includedCount} of {totalCount} included
        </span>
        <div className="flex items-center gap-3 text-xs">
          <button
            onClick={onSelectAll}
            className="text-primary-600 transition-colors hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
          >
            Select all
          </button>
          <span className="text-gray-300 dark:text-gray-700">|</span>
          <button
            onClick={onDeselectAll}
            className="text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Extension list */}
      <div className="max-h-64 overflow-y-auto rounded-md border border-gray-200 dark:border-gray-800">
        {extensions.length === 0 ? (
          <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
            No file extensions found
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {extensions.map((ext) => (
              <label
                key={ext.extension}
                className="flex cursor-pointer items-center justify-between gap-3 px-2.5 py-1.5 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60"
              >
                <div className="flex flex-1 items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={ext.selected}
                    ref={(input) => {
                      if (input) {
                        input.indeterminate = ext.indeterminate || false;
                      }
                    }}
                    onChange={() => onToggle?.(ext.extension)}
                    className="h-4 w-4 cursor-pointer rounded accent-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                  />
                  <span className="font-mono text-sm text-gray-800 dark:text-gray-200">
                    {ext.extension}
                  </span>
                </div>
                <span className="tabular-nums text-xs text-gray-500 dark:text-gray-400">
                  {ext.count}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
