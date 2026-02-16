/**
 * Complete local upload form component
 * Combines directory picker and zip uploader with tabs
 */

import { useState } from 'react';
import { DirectoryPicker } from './DirectoryPicker';
import { ZipUploader } from './ZipUploader';

interface LocalFormProps {
  onDirectorySelected?: (files: FileList) => void;
  onZipSelected?: (file: File) => void;
  onTabChange?: (tab: TabType) => void;
  disabled?: boolean;
}

type TabType = 'directory' | 'zip';

export function LocalForm({ onDirectorySelected, onZipSelected, onTabChange, disabled }: LocalFormProps) {
  const [activeTab, setActiveTab] = useState<TabType>('directory');

  const handleTabChange = (tab: TabType) => {
    if (tab !== activeTab) {
      setActiveTab(tab);
      onTabChange?.(tab);
    }
  };

  return (
    <div className="space-y-4">
      {/* Tab selector */}
      <div className="flex space-x-1 rounded-lg bg-gray-100 dark:bg-gray-800 p-1">
        <button
          onClick={() => handleTabChange('directory')}
          data-testid="local-tab-directory"
          className={`
            flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors
            ${
              activeTab === 'directory'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }
          `}
        >
          <svg className="inline w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
            />
          </svg>
          Directory
        </button>
        <button
          onClick={() => handleTabChange('zip')}
          data-testid="local-tab-zip"
          className={`
            flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors
            ${
              activeTab === 'zip'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }
          `}
        >
          <svg className="inline w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          Zip File
        </button>
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'directory' ? (
          <DirectoryPicker onDirectorySelected={onDirectorySelected} disabled={disabled} />
        ) : (
          <ZipUploader onFileSelected={onZipSelected} disabled={disabled} />
        )}
      </div>
    </div>
  );
}
