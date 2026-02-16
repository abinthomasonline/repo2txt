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

  const totalTokens = sortedFiles.reduce((sum, f) => sum + (f.tokenCount || 0), 0);
  const totalLines = sortedFiles.reduce((sum, f) => sum + (f.lineCount || 0), 0);

  return (
    <div className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900">
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          File Statistics
        </h3>
        <svg
          className={`w-5 h-5 text-gray-500 transition-transform ${
            isExpanded ? 'transform rotate-180' : ''
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

      {/* Collapsible content */}
      {isExpanded && (
        <div className="p-4 pt-0 border-t border-gray-200 dark:border-gray-700">

          {/* Summary */}
          <div className="grid grid-cols-3 gap-4 mb-4 p-3 rounded-md bg-gray-50 dark:bg-gray-800">
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Files</div>
              <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {sortedFiles.length}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Total Lines</div>
              <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {totalLines.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Total Tokens</div>
              <div className="text-lg font-semibold text-primary-600 dark:text-primary-400">
                {totalTokens.toLocaleString()}
              </div>
            </div>
          </div>

          {/* File list */}
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {sortedFiles.map((file) => (
              <div
                key={file.path}
                className="flex items-center justify-between py-2 px-3 rounded hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <div className="flex-1 min-w-0 mr-4">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {file.path.split('/').pop()}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {file.path}
                  </div>
                </div>
                <div className="flex gap-4 text-sm">
                  <div className="text-gray-600 dark:text-gray-400">
                    <span className="font-medium">{file.lineCount?.toLocaleString()}</span>
                    <span className="text-xs ml-1">lines</span>
                  </div>
                  <div className="text-primary-600 dark:text-primary-400">
                    <span className="font-medium">{file.tokenCount?.toLocaleString()}</span>
                    <span className="text-xs ml-1">tokens</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
