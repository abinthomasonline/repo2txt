/**
 * GitIgnore pattern editor component
 * Allows editing gitignore patterns with live validation
 */

import { useState, useEffect } from 'react';
import { Button } from '../ui/Button';

interface GitIgnoreEditorProps {
  patterns: string[];
  onApply?: (patterns: string[]) => void;
  onReset?: () => void;
  showExcluded?: boolean;
  onToggleExcluded?: (show: boolean) => void;
}

const COMMON_PATTERNS = [
  'node_modules/',
  '.git/',
  'dist/',
  'build/',
  '*.log',
  '.env',
  '.DS_Store',
  '*.test.*',
  '*.spec.*',
  'coverage/',
  '.vscode/',
  '.idea/',
];

export function GitIgnoreEditor({
  patterns: initialPatterns,
  onApply,
  onReset,
  showExcluded = false,
  onToggleExcluded,
}: GitIgnoreEditorProps) {
  const [patterns, setPatterns] = useState(initialPatterns.join('\n'));
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [localShowExcluded, setLocalShowExcluded] = useState(showExcluded);

  useEffect(() => {
    setPatterns(initialPatterns.join('\n'));
    setLocalShowExcluded(showExcluded);
    setHasChanges(false);
  }, [initialPatterns, showExcluded]);

  const handleApply = () => {
    const patternArray = patterns
      .split('\n')
      .map((p) => p.trim())
      .filter((p) => p && !p.startsWith('#'));

    onApply?.(patternArray);
    onToggleExcluded?.(localShowExcluded);
    setHasChanges(false);
  };

  const handleReset = () => {
    onReset?.();
    setLocalShowExcluded(showExcluded);
    setHasChanges(false);
  };

  const handleAddSuggestion = (pattern: string) => {
    const currentPatterns = patterns ? patterns + '\n' : '';
    setPatterns(currentPatterns + pattern);
    setHasChanges(true);
  };

  const handleChange = (value: string) => {
    setPatterns(value);
    const patternsChanged = value !== initialPatterns.join('\n');
    const checkboxChanged = localShowExcluded !== showExcluded;
    setHasChanges(patternsChanged || checkboxChanged);
  };

  const handleCheckboxChange = (checked: boolean) => {
    setLocalShowExcluded(checked);
    const patternsChanged = patterns !== initialPatterns.join('\n');
    const checkboxChanged = checked !== showExcluded;
    setHasChanges(patternsChanged || checkboxChanged);
  };

  const patternCount = patterns
    .split('\n')
    .filter((p) => p.trim() && !p.trim().startsWith('#')).length;

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="flex items-center justify-end">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {patternCount} {patternCount === 1 ? 'pattern' : 'patterns'}
        </span>
      </div>

      {/* Pattern input */}
      <div className="space-y-2">
        <textarea
          value={patterns}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="# Enter gitignore patterns (one per line)&#10;node_modules/&#10;*.log&#10;.env"
          className="w-full h-48 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm font-mono text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 resize-none"
        />

        <div className="text-xs text-gray-500 dark:text-gray-400">
          <p>• Use <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">#</code> for comments</p>
          <p>• Add <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">/</code> at the end for directories</p>
          <p>• Use <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">*</code> for wildcards</p>
        </div>
      </div>

      {/* Show excluded files toggle */}
      <div className="space-y-1">
        <label className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
          <input
            type="checkbox"
            checked={localShowExcluded}
            onChange={(e) => handleCheckboxChange(e.target.checked)}
            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800"
          />
          <span className="text-sm text-gray-900 dark:text-gray-100">
            Show excluded files in directory tree
          </span>
        </label>
        <p className="text-xs text-gray-500 dark:text-gray-400 pl-8">
          Controls visibility in output directory tree. Excluded file contents are never included.
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          variant="primary"
          size="sm"
          onClick={handleApply}
          disabled={!hasChanges}
          className="flex-1"
        >
          Apply Patterns
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleReset}
          className="flex-1"
        >
          Reset
        </Button>
      </div>

      {/* Pattern suggestions */}
      <div>
        <button
          onClick={() => setShowSuggestions(!showSuggestions)}
          className="flex items-center gap-1 text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
        >
          <svg
            className={`w-4 h-4 transform transition-transform ${
              showSuggestions ? 'rotate-90' : ''
            }`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
              clipRule="evenodd"
            />
          </svg>
          Common Patterns
        </button>

        {showSuggestions && (
          <div className="mt-2 grid grid-cols-2 gap-1">
            {COMMON_PATTERNS.map((pattern) => (
              <button
                key={pattern}
                onClick={() => handleAddSuggestion(pattern)}
                className="text-left px-2 py-1 text-xs font-mono rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                {pattern}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
