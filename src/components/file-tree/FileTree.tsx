/**
 * File tree component with virtual scrolling
 * Displays hierarchical file structure with checkboxes
 */

import { useRef, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { FileTreeNode } from './FileTreeNode';
import type { TreeNode } from '@/types';

const ROW_HEIGHT = 28;

interface FileTreeProps {
  nodes: TreeNode[];
  onToggle?: (path: string) => void;
  onSelect?: (path: string, selected: boolean) => void;
  showExcluded?: boolean;
  maxHeight?: number;
}

/**
 * Flatten tree structure for virtual scrolling
 */
function flattenTree(nodes: TreeNode[], showExcluded: boolean): Array<{
  node: TreeNode;
  depth: number;
}> {
  const result: Array<{ node: TreeNode; depth: number }> = [];

  function traverse(nodes: TreeNode[], depth: number) {
    for (const node of nodes) {
      // Skip if not visible and showExcluded is false
      if (node.visible === false && !showExcluded) {
        continue;
      }

      result.push({ node, depth });

      // Include children if directory is expanded (has children array)
      if (node.type === 'directory' && node.children) {
        traverse(node.children, depth + 1);
      }
    }
  }

  traverse(nodes, 0);
  return result;
}

export function FileTree({
  nodes,
  onToggle,
  onSelect,
  showExcluded = false,
  maxHeight = 600,
}: FileTreeProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Flatten tree for virtual scrolling
  const flatNodes = useMemo(
    () => flattenTree(nodes, showExcluded),
    [nodes, showExcluded]
  );

  // Virtual scrolling
  const virtualizer = useVirtualizer({
    count: flatNodes.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10, // Number of items to render outside visible area
  });

  if (nodes.length === 0) {
    return (
      <div
        data-testid="file-tree"
        className="flex h-40 items-center justify-center text-sm text-gray-500 dark:text-gray-400"
      >
        <p>No files to display</p>
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      data-testid="file-tree"
      className="overflow-auto py-1"
      style={{ maxHeight: `${maxHeight}px` }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const { node, depth } = flatNodes[virtualItem.index];

          return (
            <div
              key={virtualItem.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <FileTreeNode
                node={node}
                depth={depth}
                onToggle={onToggle}
                onSelect={onSelect}
                showExcluded={showExcluded}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
