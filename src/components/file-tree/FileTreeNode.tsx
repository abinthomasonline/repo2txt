/**
 * File tree node component
 * Represents a single file or directory in the tree
 */

import { useCallback } from 'react';
import type { TreeNode } from '@/types';

interface FileTreeNodeProps {
  node: TreeNode;
  depth: number;
  onToggle?: (path: string) => void;
  onSelect?: (path: string, selected: boolean) => void;
  showExcluded?: boolean;
}

export function FileTreeNode({
  node,
  depth,
  onToggle,
  onSelect,
  showExcluded = false,
}: FileTreeNodeProps) {
  const isDirectory = node.type === 'directory';
  const isExcluded = node.excluded || false;
  const isVisible = node.visible !== false;

  // Don't render if not visible and showExcluded is false
  if (!isVisible && !showExcluded) {
    return null;
  }

  const handleCheckboxChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      e.stopPropagation();
      onSelect?.(node.path, e.target.checked);
    },
    [node.path, onSelect]
  );

  const handleToggle = useCallback(() => {
    if (isDirectory) {
      onToggle?.(node.path);
    }
  }, [isDirectory, node.path, onToggle]);

  const getFileIcon = () => {
    if (isDirectory) {
      return (
        <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
          <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
        </svg>
      );
    }

    // File icon - can be enhanced with extension-specific icons later
    return (
      <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
          clipRule="evenodd"
        />
      </svg>
    );
  };

  const getCheckboxState = (): 'checked' | 'unchecked' | 'indeterminate' => {
    if (node.selected === true) return 'checked';
    if (node.selected === false) return 'unchecked';
    return 'indeterminate'; // For directories with some selected children
  };

  const checkboxState = getCheckboxState();

  return (
    <div
      className={`
        flex items-center gap-2 py-1 px-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded
        ${isExcluded ? 'opacity-50' : ''}
        ${isDirectory ? 'cursor-pointer' : ''}
      `}
      style={{ paddingLeft: `${depth * 20 + 8}px` }}
      onClick={handleToggle}
    >
      {/* Expand/collapse icon for directories */}
      {isDirectory && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleToggle();
          }}
          className="flex-shrink-0 p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
          aria-label={node.children ? 'Collapse' : 'Expand'}
        >
          <svg
            className={`w-3 h-3 text-gray-500 transform transition-transform ${
              node.children ? 'rotate-90' : ''
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
        </button>
      )}

      {/* Checkbox */}
      <input
        type="checkbox"
        checked={checkboxState === 'checked'}
        ref={(input) => {
          if (input) {
            input.indeterminate = checkboxState === 'indeterminate';
          }
        }}
        onChange={handleCheckboxChange}
        onClick={(e) => e.stopPropagation()}
        className="flex-shrink-0 rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800"
        aria-label={`Select ${node.name}`}
      />

      {/* Icon */}
      <div className="flex-shrink-0">{getFileIcon()}</div>

      {/* Name */}
      <span
        className={`flex-1 text-sm truncate ${
          isExcluded
            ? 'text-gray-400 dark:text-gray-600 line-through'
            : 'text-gray-900 dark:text-gray-100'
        }`}
        title={node.name}
      >
        {node.name}
      </span>

      {/* Badges (line count, token count, etc.) */}
      {!isDirectory && node.selected && (
        <div className="flex gap-1 text-xs">
          {/* Line count badge - placeholder for now */}
          {/* Will be populated when file is fetched */}
        </div>
      )}
    </div>
  );
}
