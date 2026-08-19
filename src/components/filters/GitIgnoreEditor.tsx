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

  // Sync local state with external props
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

  const handleChange = (value: string) => {
    setPatterns(value);
    const patternsChanged = value !== initialPatterns.join('\n');
    const checkboxChanged = localShowExcluded !== showExcluded;
    setHasChanges(patternsChanged || checkboxChanged);
  };

  const handleToggleSuggestion = (pattern: string) => {
    const lines = patterns.split('\n');
    const isActive = lines.some((line) => line.trim() === pattern);

    handleChange(
      isActive
        ? lines.filter((line) => line.trim() !== pattern).join('\n')
        : [...(patterns.trim() ? [patterns.replace(/\n+$/, '')] : []), pattern].join('\n')
    );
  };

  const handleCheckboxChange = (checked: boolean) => {
    setLocalShowExcluded(checked);
    const patternsChanged = patterns !== initialPatterns.join('\n');
    const checkboxChanged = checked !== showExcluded;
    setHasChanges(patternsChanged || checkboxChanged);
  };

  const patternLines = patterns.split('\n').map((p) => p.trim());
  const patternCount = patternLines.filter((p) => p && !p.startsWith('#')).length;
  const activePatterns = new Set(patternLines);

  return (
    <div className="space-y-3">
      {/* Pattern input */}
      <div className="space-y-2">
        <textarea
          value={patterns}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="# Enter gitignore patterns (one per line)&#10;node_modules/&#10;*.log&#10;.env"
          className="h-40 w-full resize-none rounded-md border border-gray-200 bg-white px-3 py-2 font-mono text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100 dark:placeholder-gray-600"
        />

        <p className="text-xs text-gray-500 dark:text-gray-400">
          One per line. <code className="rounded bg-gray-100 px-1 dark:bg-gray-800">#</code> comments,{' '}
          <code className="rounded bg-gray-100 px-1 dark:bg-gray-800">/</code> for directories,{' '}
          <code className="rounded bg-gray-100 px-1 dark:bg-gray-800">*</code> for wildcards.
        </p>
      </div>

      {/* Show excluded files toggle */}
      <div className="space-y-1">
        <label className="flex cursor-pointer items-center gap-2.5 rounded-md py-1 transition-colors">
          <input
            type="checkbox"
            checked={localShowExcluded}
            onChange={(e) => handleCheckboxChange(e.target.checked)}
            className="h-4 w-4 cursor-pointer rounded accent-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          />
          <span className="text-sm text-gray-800 dark:text-gray-200">
            Show excluded files in directory tree
          </span>
        </label>
        <p className="pl-[26px] text-xs text-gray-500 dark:text-gray-400">
          Their contents are never included.
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-3">
        <span className="tabular-nums text-xs text-gray-500 dark:text-gray-400">
          {patternCount} {patternCount === 1 ? 'pattern' : 'patterns'}
        </span>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleReset} className="text-gray-500 dark:text-gray-400">
            Reset
          </Button>
          <Button variant="primary" size="sm" onClick={handleApply} disabled={!hasChanges}>
            Apply Patterns
          </Button>
        </div>
      </div>

      {/* Pattern suggestions */}
      <div>
        <button
          onClick={() => setShowSuggestions(!showSuggestions)}
          className="flex items-center gap-1 text-xs text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
        >
          <svg
            className={`h-3 w-3 transform transition-transform ${
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
          Common patterns
        </button>

        {showSuggestions && (
          <div className="mt-2 grid grid-cols-2 gap-1">
            {COMMON_PATTERNS.map((pattern) => {
              const isActive = activePatterns.has(pattern);

              return (
                <button
                  key={pattern}
                  onClick={() => handleToggleSuggestion(pattern)}
                  aria-pressed={isActive}
                  className={`rounded border px-2 py-1 text-left font-mono text-xs transition-colors ${
                    isActive
                      ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-300'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-900 dark:border-gray-800 dark:text-gray-400 dark:hover:border-gray-700 dark:hover:text-gray-100'
                  }`}
                >
                  {pattern}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
