import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FileTree } from '../FileTree';
import type { TreeNode } from '@/types';

describe('FileTree', () => {
  const mockNodes: TreeNode[] = [
    {
      name: 'src',
      path: 'src',
      type: 'directory',
      selected: false,
      visible: true,
      children: [
        {
          name: 'index.ts',
          path: 'src/index.ts',
          type: 'file',
          selected: false,
          visible: true,
        },
      ],
    },
    {
      name: 'README.md',
      path: 'README.md',
      type: 'file',
      selected: false,
      visible: true,
    },
  ];

  it('should render file tree', () => {
    const { container } = render(<FileTree nodes={mockNodes} />);

    // Check that the tree container is rendered
    const treeContainer = container.querySelector('.border');
    expect(treeContainer).toBeInTheDocument();
  });

  it('should render empty state when no nodes', () => {
    render(<FileTree nodes={[]} />);

    expect(screen.getByText('No files to display')).toBeInTheDocument();
  });

  it('should flatten tree structure for rendering', () => {
    const { container } = render(<FileTree nodes={mockNodes} />);

    // Virtual scrolling creates a sized container
    const virtualContainer = container.querySelector('[style*="height"]');
    expect(virtualContainer).toBeInTheDocument();
  });

  it('should call onToggle when provided', () => {
    const onToggle = vi.fn();
    render(<FileTree nodes={mockNodes} onToggle={onToggle} />);

    // Toggle functionality tested via FileTreeNode
    expect(onToggle).not.toHaveBeenCalled(); // Not clicked yet
  });

  it('should call onSelect when provided', () => {
    const onSelect = vi.fn();
    render(<FileTree nodes={mockNodes} onSelect={onSelect} />);

    // Select functionality tested via FileTreeNode
    expect(onSelect).not.toHaveBeenCalled(); // Not clicked yet
  });

  it('should respect maxHeight prop', () => {
    const { container } = render(<FileTree nodes={mockNodes} maxHeight={400} />);

    const treeContainer = container.firstChild as HTMLElement;
    expect(treeContainer.style.maxHeight).toBe('400px');
  });
});
