/**
 * Directory picker component
 * Mobile-friendly with progress indicator
 */

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';

interface DirectoryPickerProps {
  onDirectorySelected?: (files: FileList) => void;
  disabled?: boolean;
}

export function DirectoryPicker({ onDirectorySelected, disabled }: DirectoryPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileCount, setFileCount] = useState<number>(0);
  const [isSupported, setIsSupported] = useState(true);

  const handleClick = () => {
    // Check browser support
    const input = document.createElement('input');
    if (!('webkitdirectory' in input)) {
      setIsSupported(false);
      return;
    }

    inputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setFileCount(files.length);
      onDirectorySelected?.(files);
    }
  };

  if (!isSupported) {
    return (
      <div className="rounded-md bg-yellow-50 dark:bg-yellow-900/20 p-4">
        <div className="flex">
          <svg
            className="h-5 w-5 text-yellow-400"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              Browser not supported
            </h3>
            <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
              <p>
                Your browser doesn't support directory uploads. Please use a modern browser like
                Chrome, Edge, or Safari.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        /* @ts-expect-error - webkitdirectory is not in TypeScript types */
        webkitdirectory=""
        directory=""
        multiple
        onChange={handleChange}
        className="hidden"
      />

      <Button
        onClick={handleClick}
        disabled={disabled}
        variant="primary"
        className="w-full"
      >
        <svg
          className="w-5 h-5 mr-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
          />
        </svg>
        Select Directory
      </Button>

      {fileCount > 0 && (
        <div className="rounded-md bg-green-50 dark:bg-green-900/20 p-3">
          <div className="flex items-center">
            <svg
              className="h-5 w-5 text-green-400"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <p className="ml-3 text-sm text-green-800 dark:text-green-200">
              {fileCount} {fileCount === 1 ? 'file' : 'files'} selected
            </p>
          </div>
        </div>
      )}

      <div className="text-xs text-gray-500 dark:text-gray-400">
        <p>Select a directory from your device to upload all files.</p>
        <p className="mt-1">
          <strong>Note:</strong> Large directories may take time to process.
        </p>
      </div>
    </div>
  );
}
