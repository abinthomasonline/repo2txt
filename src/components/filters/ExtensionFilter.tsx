/**
 * Extension filter component
 * Allows filtering files by extension
 */

import { useState } from 'react';
import { Button } from '../ui/Button';
import type { ExtensionFilter as ExtensionFilterType } from '@/types';

interface ExtensionFilterProps {
  extensions: ExtensionFilterType[];
  onToggle?: (extension: string) => void;
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
  onAddCustom?: (extension: string) => void;
}

export function ExtensionFilter({
  extensions,
  onToggle,
  onSelectAll,
  onDeselectAll,
  onAddCustom,
}: ExtensionFilterProps) {
  const [customExtension, setCustomExtension] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  const handleAddCustom = () => {
    if (customExtension.trim()) {
      // Ensure extension starts with a dot
      const ext = customExtension.startsWith('.')
        ? customExtension
        : `.${customExtension}`;
      onAddCustom?.(ext);
      setCustomExtension('');
      setShowCustomInput(false);
    }
  };

  const selectedCount = extensions.filter((e) => e.selected).length;
  const totalCount = extensions.length;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
          File Extensions
        </h3>
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

      {/* Custom extension input */}
      {showCustomInput ? (
        <div className="flex gap-2">
          <input
            type="text"
            value={customExtension}
            onChange={(e) => setCustomExtension(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleAddCustom();
              } else if (e.key === 'Escape') {
                setShowCustomInput(false);
                setCustomExtension('');
              }
            }}
            placeholder=".ext or ext"
            className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400"
            autoFocus
          />
          <Button variant="primary" size="sm" onClick={handleAddCustom}>
            Add
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowCustomInput(false);
              setCustomExtension('');
            }}
          >
            Cancel
          </Button>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowCustomInput(true)}
          className="w-full"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Add Custom Extension
        </Button>
      )}
    </div>
  );
}
