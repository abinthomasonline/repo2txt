/**
 * Extension filter component
 * Allows filtering files by extension
 */

import { Button } from '../ui/Button';
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
  const selectedCount = extensions.filter((e) => e.selected).length;
  const totalCount = extensions.length;

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="flex items-center justify-end">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {selectedCount} of {totalCount} selected
        </span>
      </div>

      {/* Batch actions */}
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={onSelectAll}
          className="flex-1"
        >
          Select All
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={onDeselectAll}
          className="flex-1"
        >
          Deselect All
        </Button>
      </div>

      {/* Extension list */}
      <div className="max-h-64 overflow-y-auto border border-gray-300 dark:border-gray-700 rounded-lg">
        {extensions.length === 0 ? (
          <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
            No file extensions found
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {extensions.map((ext) => (
              <label
                key={ext.extension}
                className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
              >
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="checkbox"
                    checked={ext.selected}
                    ref={(input) => {
                      if (input) {
                        input.indeterminate = ext.indeterminate || false;
                      }
                    }}
                    onChange={() => onToggle?.(ext.extension)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800"
                  />
                  <span className="text-sm text-gray-900 dark:text-gray-100 font-mono">
                    {ext.extension}
                  </span>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">
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
