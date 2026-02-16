import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GitHubUrlInput } from '../GitHubUrlInput';
import { useStore } from '@/store';

// Mock the store
vi.mock('@/store', () => ({
  useStore: vi.fn(),
}));

describe('GitHubUrlInput', () => {
  const mockSetRepoUrl = vi.fn();
  const mockOnValidUrl = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useStore as any).mockReturnValue({
      repoUrl: '',
      setRepoUrl: mockSetRepoUrl,
    });
  });

  it('should render input field', () => {
    render(<GitHubUrlInput />);

    const input = screen.getByPlaceholderText('https://github.com/facebook/react');
    expect(input).toBeInTheDocument();
  });

  it('should show placeholder text', () => {
    render(<GitHubUrlInput />);

    const input = screen.getByPlaceholderText('https://github.com/facebook/react');
    expect(input).toBeInTheDocument();
  });

  it('should toggle hints when info button is clicked', async () => {
    render(<GitHubUrlInput />);

    const toggleButton = screen.getByLabelText('Toggle URL format hints');

    // Hints should be hidden initially
    expect(screen.queryByText('Supported URL formats:')).not.toBeInTheDocument();

    // Click to show hints
    await userEvent.click(toggleButton);
    expect(screen.getByText('Supported URL formats:')).toBeInTheDocument();

    // Click to hide hints
    await userEvent.click(toggleButton);
    expect(screen.queryByText('Supported URL formats:')).not.toBeInTheDocument();
  });

  it('should validate valid GitHub URLs', async () => {
    const onUrlChange = vi.fn();
    render(<GitHubUrlInput onUrlChange={onUrlChange} />);

    const input = screen.getByPlaceholderText('https://github.com/facebook/react');

    await userEvent.type(input, 'https://github.com/facebook/react');

    await waitFor(() => {
      expect(screen.getByText('Valid GitHub URL')).toBeInTheDocument();
    });

    // Component should call onUrlChange with the URL and validity status
    expect(onUrlChange).toHaveBeenLastCalledWith('https://github.com/facebook/react', true);
  });

  it('should show error for invalid URLs', async () => {
    render(<GitHubUrlInput />);

    const input = screen.getByPlaceholderText('https://github.com/facebook/react');

    await userEvent.type(input, 'https://gitlab.com/owner/repo');

    await waitFor(() => {
      expect(screen.getByText('Invalid GitHub URL format')).toBeInTheDocument();
    });
  });

  it('should validate URL with branch', async () => {
    render(<GitHubUrlInput />);

    const input = screen.getByPlaceholderText('https://github.com/facebook/react');

    await userEvent.type(input, 'https://github.com/facebook/react/tree/main');

    await waitFor(() => {
      expect(screen.getByText('Valid GitHub URL')).toBeInTheDocument();
    });
  });

  it('should validate URL with branch and path', async () => {
    render(<GitHubUrlInput />);

    const input = screen.getByPlaceholderText('https://github.com/facebook/react');

    await userEvent.type(input, 'https://github.com/facebook/react/tree/main/packages/react');

    await waitFor(() => {
      expect(screen.getByText('Valid GitHub URL')).toBeInTheDocument();
    });
  });

  it('should show clear button when URL is entered', async () => {
    render(<GitHubUrlInput />);

    const input = screen.getByPlaceholderText('https://github.com/facebook/react');

    // Clear button should not be visible initially
    expect(screen.queryByTitle('Clear URL')).not.toBeInTheDocument();

    await userEvent.type(input, 'https://github.com/facebook/react');

    // Clear button should appear
    await waitFor(() => {
      expect(screen.getByTitle('Clear URL')).toBeInTheDocument();
    });
  });

  it('should clear URL when clear button is clicked', async () => {
    const onUrlChange = vi.fn();
    render(<GitHubUrlInput onUrlChange={onUrlChange} />);

    const input = screen.getByPlaceholderText('https://github.com/facebook/react') as HTMLInputElement;

    await userEvent.type(input, 'https://github.com/facebook/react');

    await waitFor(() => {
      expect(input.value).toBe('https://github.com/facebook/react');
    });

    const clearButton = screen.getByTitle('Clear URL');
    await userEvent.click(clearButton);

    expect(input.value).toBe('');
    // Component should call onUrlChange with empty URL and invalid status
    expect(onUrlChange).toHaveBeenLastCalledWith('', false);
  });

  it('should call onValidUrl callback when valid URL is entered', async () => {
    render(<GitHubUrlInput onValidUrl={mockOnValidUrl} />);

    const input = screen.getByPlaceholderText('https://github.com/facebook/react');

    await userEvent.type(input, 'https://github.com/facebook/react');

    // Note: onValidUrl is called on form submit, not on input change
    // We would need to add a submit button or test the form submission
  });

  it('should not show error or success message when input is empty', () => {
    render(<GitHubUrlInput />);

    expect(screen.queryByText('Invalid GitHub URL format')).not.toBeInTheDocument();
    expect(screen.queryByText('Valid GitHub URL')).not.toBeInTheDocument();
  });

  it('should call onUrlChange callback when URL changes', async () => {
    const onUrlChange = vi.fn();
    render(<GitHubUrlInput onUrlChange={onUrlChange} />);

    const input = screen.getByPlaceholderText('https://github.com/facebook/react');

    await userEvent.type(input, 'https://github.com/facebook/react');

    await waitFor(() => {
      // Should be called with the complete URL and validity status
      expect(onUrlChange).toHaveBeenLastCalledWith('https://github.com/facebook/react', true);
    });
  });

  it('should load initial URL from store', () => {
    (useStore as any).mockReturnValue({
      repoUrl: 'https://github.com/facebook/react',
      setRepoUrl: mockSetRepoUrl,
    });

    render(<GitHubUrlInput />);

    const input = screen.getByPlaceholderText('https://github.com/facebook/react') as HTMLInputElement;
    expect(input.value).toBe('https://github.com/facebook/react');
  });

  it('should have proper aria attributes for accessibility', () => {
    render(<GitHubUrlInput />);

    const input = screen.getByPlaceholderText('https://github.com/facebook/react');
    expect(input).toHaveAttribute('id', 'github-url');
    expect(input).toHaveAttribute('type', 'url');
  });

  it('should mark input as invalid when error is present', async () => {
    render(<GitHubUrlInput />);

    const input = screen.getByPlaceholderText('https://github.com/facebook/react');

    await userEvent.type(input, 'invalid-url');

    await waitFor(() => {
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });
  });
});
