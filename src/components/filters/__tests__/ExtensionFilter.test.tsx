import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExtensionFilter } from '../ExtensionFilter';
import type { ExtensionFilter as ExtensionFilterType } from '@/types';

describe('ExtensionFilter', () => {
  const mockExtensions: ExtensionFilterType[] = [
    { extension: '.ts', count: 10, selected: true },
    { extension: '.tsx', count: 5, selected: true },
    { extension: '.js', count: 3, selected: false },
  ];

  it('should render extension list', () => {
    render(<ExtensionFilter extensions={mockExtensions} />);

    expect(screen.getByText('.ts')).toBeInTheDocument();
    expect(screen.getByText('.tsx')).toBeInTheDocument();
    expect(screen.getByText('.js')).toBeInTheDocument();
  });

  it('should display counts for each extension', () => {
    render(<ExtensionFilter extensions={mockExtensions} />);

    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('should show selected count', () => {
    render(<ExtensionFilter extensions={mockExtensions} />);

    expect(screen.getByText('2 of 3 selected')).toBeInTheDocument();
  });

  it('should call onToggle when checkbox is clicked', () => {
    const onToggle = vi.fn();
    render(<ExtensionFilter extensions={mockExtensions} onToggle={onToggle} />);

    const checkbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(checkbox);

    expect(onToggle).toHaveBeenCalledWith('.ts');
  });

  it('should call onSelectAll when Select All is clicked', () => {
    const onSelectAll = vi.fn();
    render(<ExtensionFilter extensions={mockExtensions} onSelectAll={onSelectAll} />);

    const selectAllButton = screen.getByText('Select All');
    fireEvent.click(selectAllButton);

    expect(onSelectAll).toHaveBeenCalled();
  });

  it('should call onDeselectAll when Deselect All is clicked', () => {
    const onDeselectAll = vi.fn();
    render(<ExtensionFilter extensions={mockExtensions} onDeselectAll={onDeselectAll} />);

    const deselectAllButton = screen.getByText('Deselect All');
    fireEvent.click(deselectAllButton);

    expect(onDeselectAll).toHaveBeenCalled();
  });

  // Note: "Add Custom Extension" feature was removed in favor of auto-detection only

  it('should show empty state when no extensions', () => {
    render(<ExtensionFilter extensions={[]} />);

    expect(screen.getByText('No file extensions found')).toBeInTheDocument();
  });
});
