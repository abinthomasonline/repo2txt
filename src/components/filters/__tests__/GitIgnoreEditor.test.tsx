import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GitIgnoreEditor } from '../GitIgnoreEditor';

describe('GitIgnoreEditor', () => {
  const mockPatterns = ['node_modules/', '*.log', '.env'];

  it('should render with initial patterns', () => {
    render(<GitIgnoreEditor patterns={mockPatterns} />);

    const textarea = screen.getByPlaceholderText(/Enter gitignore patterns/);
    expect(textarea).toHaveValue('node_modules/\n*.log\n.env');
  });

  it('should show pattern count', () => {
    render(<GitIgnoreEditor patterns={mockPatterns} />);

    expect(screen.getByText('3 patterns')).toBeInTheDocument();
  });

  it('should call onApply when Apply button is clicked', async () => {
    const onApply = vi.fn();
    render(<GitIgnoreEditor patterns={mockPatterns} onApply={onApply} />);

    const textarea = screen.getByPlaceholderText(/Enter gitignore patterns/);
    await userEvent.type(textarea, '\ndist/');

    const applyButton = screen.getByText('Apply Patterns');
    await userEvent.click(applyButton);

    expect(onApply).toHaveBeenCalledWith(['node_modules/', '*.log', '.env', 'dist/']);
  });

  it('should call onReset when Reset button is clicked', () => {
    const onReset = vi.fn();
    render(<GitIgnoreEditor patterns={mockPatterns} onReset={onReset} />);

    const resetButton = screen.getByText('Reset');
    fireEvent.click(resetButton);

    expect(onReset).toHaveBeenCalled();
  });

  it('should toggle show excluded files', async () => {
    const onToggleExcluded = vi.fn();
    render(<GitIgnoreEditor patterns={mockPatterns} onToggleExcluded={onToggleExcluded} />);

    const checkbox = screen.getByLabelText('Show excluded files in directory tree');
    await userEvent.click(checkbox);

    // The callback is only called when Apply button is clicked
    const applyButton = screen.getByText('Apply Patterns');
    await userEvent.click(applyButton);

    expect(onToggleExcluded).toHaveBeenCalledWith(true);
  });

  it('should disable Apply button when no changes', () => {
    render(<GitIgnoreEditor patterns={mockPatterns} />);

    const applyButton = screen.getByText('Apply Patterns');
    expect(applyButton).toBeDisabled();
  });

  it('should enable Apply button when patterns change', async () => {
    render(<GitIgnoreEditor patterns={mockPatterns} />);

    const textarea = screen.getByPlaceholderText(/Enter gitignore patterns/);
    await userEvent.type(textarea, '\n# comment');

    const applyButton = screen.getByText('Apply Patterns');
    expect(applyButton).not.toBeDisabled();
  });

  it('should show common patterns when expanded', async () => {
    render(<GitIgnoreEditor patterns={[]} />);

    const toggleButton = screen.getByText('Common Patterns');
    await userEvent.click(toggleButton);

    expect(screen.getByText('node_modules/')).toBeInTheDocument();
    expect(screen.getByText('.git/')).toBeInTheDocument();
  });

  it('should add common pattern when clicked', async () => {
    render(<GitIgnoreEditor patterns={[]} />);

    const toggleButton = screen.getByText('Common Patterns');
    await userEvent.click(toggleButton);

    const patternButton = screen.getByText('node_modules/');
    await userEvent.click(patternButton);

    const textarea = screen.getByPlaceholderText(/Enter gitignore patterns/) as HTMLTextAreaElement;
    expect(textarea.value).toContain('node_modules/');
  });
});
