/**
 * Output panel component
 * Displays formatted output with download and copy functionality
 */

import { useState } from 'react';
import { Button } from './ui/Button';
import { Panel } from './ui/Panel';
import { FileStats } from './FileStats';
import type { FormattedOutput } from '@/types';

interface OutputPanelProps {
  output: FormattedOutput | null;
  isLoading?: boolean;
  repoName?: string;
}

export function OutputPanel({ output, isLoading = false, repoName = 'repo-export' }: OutputPanelProps) {
  const [copied, setCopied] = useState(false);
  const [downloadFormat, setDownloadFormat] = useState<'txt' | 'md' | 'zip'>('txt');
  const [isDownloading, setIsDownloading] = useState(false);

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

  const handleDownload = async () => {
    if (!output) return;

    setIsDownloading(true);

    try {
      const fullText = `${output.directoryTree}\n\n${output.fileContents}`;

      if (downloadFormat === 'zip') {
        // ZIP support is only needed when the user explicitly chooses that format.
        const { default: JSZip } = await import('jszip');

        // Create ZIP file
        const zip = new JSZip();

        // Add main output file
        zip.file(`${repoName}.txt`, fullText);

        // Add metadata file
        const metadata = {
          generatedAt: new Date().toISOString(),
          repository: repoName,
          lineCount: output.lineCount,
          tokenCount: output.tokenCount,
          fileCount: output.files?.length || 0,
        };
        zip.file('metadata.json', JSON.stringify(metadata, null, 2));

        // Generate and download ZIP
        const blob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${repoName}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        // Download as text file (txt or md)
        const blob = new Blob([fullText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${repoName}.${downloadFormat}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to download:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <Panel className="flex h-40 items-center justify-center gap-3 text-sm text-gray-500 dark:text-gray-400">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-primary-600 dark:border-gray-700 dark:border-t-primary-400" />
        Reading files
      </Panel>
    );
  }

  if (!output) {
    return (
      <Panel className="flex h-40 items-center justify-center text-sm text-gray-500 dark:text-gray-400">
        Select files to generate output
      </Panel>
    );
  }

  const fullText = `${output.directoryTree}\n\n${output.fileContents}`;
  const fileCount = output.files?.length ?? 0;

  return (
    <Panel className="overflow-hidden">
      {/* Totals and actions */}
      <div className="flex flex-col gap-3 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-baseline gap-2">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Output</h2>
          <p className="tabular-nums text-xs text-gray-500 dark:text-gray-400">
            {fileCount.toLocaleString()} files · {output.lineCount.toLocaleString()} lines ·{' '}
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {output.tokenCount.toLocaleString()}
            </span>{' '}
            tokens
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={handleCopy} title="Copy to clipboard">
            {copied ? 'Copied' : 'Copy'}
          </Button>

          <select
            value={downloadFormat}
            onChange={(e) => setDownloadFormat(e.target.value as 'txt' | 'md' | 'zip')}
            className="h-9 rounded-md border border-gray-200 bg-white px-2 text-sm text-gray-700 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 sm:h-8"
            aria-label="Download format"
          >
            <option value="txt">.txt</option>
            <option value="md">.md</option>
            <option value="zip">.zip</option>
          </select>

          <Button
            variant="primary"
            size="sm"
            onClick={handleDownload}
            disabled={isDownloading}
            title={`Download as ${downloadFormat.toUpperCase()}`}
          >
            {isDownloading ? 'Preparing' : 'Download'}
          </Button>
        </div>
      </div>

      {/* Per-file breakdown */}
      {output.files && output.files.length > 0 && <FileStats files={output.files} />}

      {/* Output preview */}
      <div className="max-h-96 overflow-auto border-t border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-950/50">
        <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-gray-700 dark:text-gray-300">
          {fullText}
        </pre>
      </div>
    </Panel>
  );
}
