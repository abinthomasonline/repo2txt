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
  const isExpanded = isDirectory && node.children !== undefined;
  const isExcluded = node.excluded || false;
  const isVisible = node.visible !== false;

  const handleCheckboxChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      e.stopPropagation();
      onSelect?.(node.path, e.target.checked);
    },
    [node.path, onSelect]
  );

  const handleToggle = useCallback(() => {
    onToggle?.(node.path);
  }, [node.path, onToggle]);

  // Clicking a row expands a directory or flips a file's selection
  const handleRowClick = useCallback(() => {
    if (isDirectory) {
      handleToggle();
    } else if (!isExcluded) {
      onSelect?.(node.path, node.selected !== true);
    }
  }, [handleToggle, isDirectory, isExcluded, node.path, node.selected, onSelect]);

  // Don't render if not visible and showExcluded is false
  if (!isVisible && !showExcluded) {
    return null;
  }

  const getFileIcon = () => {
    if (isDirectory) {
      return isExpanded ? (
        <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="currentColor" viewBox="0 0 20 20">
          <path d="M2 6a2 2 0 012-2h4l2 2h4a2 2 0 012 2H4a2 2 0 00-1.94 1.515L2 9.5V6z" />
          <path d="M4.06 9h13.38a1 1 0 01.97 1.243l-1.25 5A1 1 0 0116.19 16H2.75a1 1 0 01-.97-1.243l1.31-5.243A1 1 0 014.06 9z" />
        </svg>
      ) : (
        <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="currentColor" viewBox="0 0 20 20">
          <path d="M2 6a2 2 0 012-2h4l2 2h4a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
        </svg>
      );
    }

    // File icon - can be enhanced with extension-specific icons later
    return (
      <svg className="w-4 h-4 text-gray-400 dark:text-gray-600" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
          clipRule="evenodd"
        />
      </svg>
    );
  };

  const getCheckboxState = (): 'checked' | 'unchecked' | 'indeterminate' => {
    if (node.selected === 'indeterminate') return 'indeterminate';
    if (node.selected === true) return 'checked';
    return 'unchecked';
  };

  const checkboxState = getCheckboxState();

  return (
    <div
      className={`
        group flex h-full items-center gap-2 pl-2 pr-3 text-sm
        hover:bg-gray-100 dark:hover:bg-gray-800/70
        ${isExcluded ? 'opacity-50' : ''}
        ${isDirectory || !isExcluded ? 'cursor-pointer' : ''}
      `}
      onClick={handleRowClick}
    >
      {/* One guide per ancestor level, so files and directories share an indent */}
      {Array.from({ length: depth }, (_, level) => (
        <span
          key={level}
          data-indent-guide
          aria-hidden="true"
          className="h-full w-4 flex-shrink-0 border-r border-gray-200 dark:border-gray-800"
        />
      ))}

      {/* Disclosure slot, kept for files so their content lines up with sibling directories */}
      <span data-disclosure-slot className="flex h-5 w-5 flex-shrink-0 items-center justify-center">
        {isDirectory && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleToggle();
            }}
            className="flex h-5 w-5 items-center justify-center rounded text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:hover:bg-gray-700 dark:hover:text-gray-200"
            aria-expanded={isExpanded}
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            <svg
              className={`w-3 h-3 transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}
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
      </span>

      {/* Checkbox - hidden for excluded files */}
      {!isExcluded ? (
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
          className="h-4 w-4 flex-shrink-0 cursor-pointer rounded accent-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          aria-label={`Select ${node.name}`}
        />
      ) : (
        /* Spacer for excluded files to maintain alignment */
        <div className="h-4 w-4 flex-shrink-0" />
      )}

      {/* Icon */}
      <div className="flex-shrink-0">{getFileIcon()}</div>

      {/* Name */}
      <span
        className={`flex-1 truncate ${isDirectory ? 'font-medium' : ''} ${
          isExcluded
            ? 'text-gray-400 line-through dark:text-gray-600'
            : 'text-gray-800 dark:text-gray-200'
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
