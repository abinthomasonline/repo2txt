/**
 * Output panel component
 * Displays formatted output with download and copy functionality
 */

import { useState } from 'react';
import { Button } from './ui/Button';
import { FileStats } from './FileStats';
import type { FormattedOutput } from '@/types';

interface OutputPanelProps {
  output: FormattedOutput | null;
  isLoading?: boolean;
}

export function OutputPanel({ output, isLoading = false }: OutputPanelProps) {
  const [copied, setCopied] = useState(false);
  const [downloadFormat, setDownloadFormat] = useState<'txt' | 'md'>('txt');

  const handleCopy = async () => {
    if (!output) return;

    const fullText = `${output.directoryTree}\n\n${output.fileContents}`;

    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleDownload = () => {
    if (!output) return;

    const fullText = `${output.directoryTree}\n\n${output.fileContents}`;
    const blob = new Blob([fullText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `repo-export.${downloadFormat}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Loading files...
          </p>
        </div>
      </div>
    );
  }

  if (!output) {
    return (
      <div className="flex items-center justify-center h-64 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="mt-2 text-sm">Select files to generate output</p>
        </div>
      </div>
    );
  }

  const fullText = `${output.directoryTree}\n\n${output.fileContents}`;

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Stats */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 gap-3 sm:gap-0">
        <div className="flex gap-4 sm:gap-6">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Lines</p>
            <p className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">
              {output.lineCount.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Tokens</p>
            <p className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">
              {output.tokenCount.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleCopy}
            title="Copy to clipboard"
          >
            {copied ? (
              <>
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                Copy
              </>
            )}
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleDownload}
            title="Download as file"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Download
          </Button>
        </div>
      </div>

      {/* Per-file statistics */}
      {output.files && output.files.length > 0 && (
        <FileStats files={output.files} />
      )}

      {/* Output preview */}
      <div className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="p-4 border-b border-gray-300 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Output Preview
          </h3>
        </div>
        <div className="p-4 max-h-96 overflow-auto">
          <pre className="text-xs font-mono text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
            {fullText}
          </pre>
        </div>
      </div>
    </div>
  );
}
