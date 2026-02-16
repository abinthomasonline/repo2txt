import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FileTreeNode } from '../FileTreeNode';
import type { TreeNode } from '@/types';

describe('FileTreeNode', () => {
  const mockFileNode: TreeNode = {
    name: 'test.ts',
    path: 'src/test.ts',
    type: 'file',
    selected: false,
    visible: true,
  };

  const mockDirNode: TreeNode = {
    name: 'src',
    path: 'src',
    type: 'directory',
    selected: false,
    visible: true,
    children: [],
  };

  it('should render file node', () => {
    render(<FileTreeNode node={mockFileNode} depth={0} />);

    expect(screen.getByText('test.ts')).toBeInTheDocument();
  });

  it('should render directory node', () => {
    render(<FileTreeNode node={mockDirNode} depth={0} />);

    expect(screen.getByText('src')).toBeInTheDocument();
  });

  it('should call onSelect when checkbox is clicked', () => {
    const onSelect = vi.fn();
    render(<FileTreeNode node={mockFileNode} depth={0} onSelect={onSelect} />);

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    expect(onSelect).toHaveBeenCalledWith('src/test.ts', true);
  });

  it('should call onToggle when directory is clicked', () => {
    const onToggle = vi.fn();
    render(<FileTreeNode node={mockDirNode} depth={0} onToggle={onToggle} />);

    const node = screen.getByText('src').closest('div');
    fireEvent.click(node!);

    expect(onToggle).toHaveBeenCalledWith('src');
  });

  it('should render with correct indentation', () => {
    render(<FileTreeNode node={mockFileNode} depth={2} />);

    const node = screen.getByText('test.ts').closest('div');
    expect(node).toHaveStyle({ paddingLeft: '48px' }); // depth * 20 + 8
  });

  it('should render checked checkbox for selected node', () => {
    const selectedNode = { ...mockFileNode, selected: true };
    render(<FileTreeNode node={selectedNode} depth={0} />);

    const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
  });

  it('should render indeterminate checkbox for partially selected directory', () => {
    const partialNode: TreeNode = {
      ...mockDirNode,
      selected: undefined,
    };
    render(<FileTreeNode node={partialNode} depth={0} />);

    const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
    expect(checkbox.indeterminate).toBe(true);
  });

  it('should render excluded node with opacity', () => {
    const excludedNode = { ...mockFileNode, excluded: true };
    render(<FileTreeNode node={excludedNode} depth={0} />);

    const node = screen.getByText('test.ts').closest('div');
    expect(node?.className).toContain('opacity-50');
  });

  it('should not render invisible node when showExcluded is false', () => {
    const invisibleNode = { ...mockFileNode, visible: false };
    render(<FileTreeNode node={invisibleNode} depth={0} showExcluded={false} />);

    expect(screen.queryByText('test.ts')).not.toBeInTheDocument();
  });

  it('should render invisible node when showExcluded is true', () => {
    const invisibleNode = { ...mockFileNode, visible: false };
    render(<FileTreeNode node={invisibleNode} depth={0} showExcluded={true} />);

    expect(screen.getByText('test.ts')).toBeInTheDocument();
  });

  it('should render expand/collapse button for directories', () => {
    render(<FileTreeNode node={mockDirNode} depth={0} />);

    // Directory with children array means it's expanded, so label is "Collapse"
    const collapseButton = screen.getByLabelText('Collapse');
    expect(collapseButton).toBeInTheDocument();
  });

  it('should not render expand/collapse button for files', () => {
    render(<FileTreeNode node={mockFileNode} depth={0} />);

    expect(screen.queryByLabelText('Expand')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Collapse')).not.toBeInTheDocument();
  });

  it('should have proper accessibility labels', () => {
    render(<FileTreeNode node={mockFileNode} depth={0} />);

    const checkbox = screen.getByLabelText('Select test.ts');
    expect(checkbox).toBeInTheDocument();
  });
});
