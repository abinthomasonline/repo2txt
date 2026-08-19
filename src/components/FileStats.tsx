/**
 * File Statistics component
 * Displays per-file token and line counts
 */

import { useState } from 'react';
import type { FileContent } from '@/types';

interface FileStatsProps {
  files: FileContent[];
}

export function FileStats({ files }: FileStatsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!files || files.length === 0) {
    return null;
  }

  // Filter files that have token counts
  const filesWithStats = files.filter((f) => f.tokenCount !== undefined);

  if (filesWithStats.length === 0) {
    return null;
  }

  // Sort by token count (descending)
  const sortedFiles = [...filesWithStats].sort(
    (a, b) => (b.tokenCount || 0) - (a.tokenCount || 0)
  );

  return (
    <div className="border-t border-gray-200 dark:border-gray-800">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60"
      >
        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
          Largest files
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
      </button>

      {isExpanded && (
        <div className="max-h-64 overflow-y-auto border-t border-gray-100 dark:border-gray-800/60">
          {sortedFiles.map((file) => (
            <div
              key={file.path}
              className="flex items-center justify-between gap-4 px-3 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-gray-800/60"
            >
              <span
                className="truncate font-mono text-gray-700 dark:text-gray-300"
                title={file.path}
              >
                {file.path}
              </span>
              <span className="flex-shrink-0 tabular-nums text-gray-500 dark:text-gray-400">
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {file.tokenCount?.toLocaleString()}
                </span>{' '}
                tokens · {file.lineCount?.toLocaleString() ?? '—'} lines
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
