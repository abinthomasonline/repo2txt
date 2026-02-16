import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GitHubAuth } from '../GitHubAuth';
import { useStore } from '@/store';

// Mock the store
vi.mock('@/store', () => ({
  useStore: vi.fn(),
}));

describe('GitHubAuth', () => {
  const mockSetCredentials = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    (useStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      credentials: null,
      setCredentials: mockSetCredentials,
    });
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('should render token input field', () => {
    render(<GitHubAuth />);

    const input = screen.getByPlaceholderText('ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');
    expect(input).toBeInTheDocument();
  });

  it('should show (optional) label', () => {
    render(<GitHubAuth />);

    expect(screen.getByText('(optional)')).toBeInTheDocument();
  });

  it('should render password type input', () => {
    render(<GitHubAuth />);

    const input = screen.getByPlaceholderText('ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');
    expect(input).toHaveAttribute('type', 'password');
  });

  it('should show placeholder text', () => {
    render(<GitHubAuth />);

    const input = screen.getByPlaceholderText('ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');
    expect(input).toBeInTheDocument();
  });

  it('should toggle info panel when info button is clicked', async () => {
    render(<GitHubAuth />);

    const toggleButton = screen.getByLabelText('Toggle token information');

    // Info should be hidden initially
    expect(screen.queryByText(/A token is required for private repositories/i)).not.toBeInTheDocument();

    // Click to show info
    await userEvent.click(toggleButton);
    expect(screen.getByText(/A token is required for private repositories/i)).toBeInTheDocument();

    // Click to hide info
    await userEvent.click(toggleButton);
    expect(screen.queryByText(/A token is required for private repositories/i)).not.toBeInTheDocument();
  });

  it('should display token creation link in info panel', async () => {
    render(<GitHubAuth />);

    const toggleButton = screen.getByLabelText('Toggle token information');
    await userEvent.click(toggleButton);

    const link = screen.getByText('Get your token');
    expect(link).toHaveAttribute('href', 'https://github.com/settings/tokens/new?description=repo2txt&scopes=repo');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('should save token to sessionStorage when entered', async () => {
    render(<GitHubAuth />);

    const input = screen.getByPlaceholderText('ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');
    const token = 'ghp_testtoken123';

    await userEvent.type(input, token);

    expect(sessionStorage.getItem('github_token')).toBe(token);
  });

  it('should update store when token is entered', async () => {
    render(<GitHubAuth />);

    const input = screen.getByPlaceholderText('ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');
    const token = 'ghp_testtoken123';

    await userEvent.type(input, token);

    await waitFor(() => {
      expect(mockSetCredentials).toHaveBeenCalledWith({ token });
    });
  });

  it('should load saved token from sessionStorage on mount', () => {
    const savedToken = 'ghp_savedtoken456';
    sessionStorage.setItem('github_token', savedToken);

    render(<GitHubAuth />);

    const input = screen.getByPlaceholderText('ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx') as HTMLInputElement;
    expect(input.value).toBe(savedToken);
    expect(mockSetCredentials).toHaveBeenCalledWith({ token: savedToken });
  });

  it('should show clear button when token is entered', async () => {
    render(<GitHubAuth />);

    const input = screen.getByPlaceholderText('ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');

    // Clear button should not be visible initially
    expect(screen.queryByTitle('Clear token')).not.toBeInTheDocument();

    await userEvent.type(input, 'ghp_testtoken123');

    // Clear button should appear
    await waitFor(() => {
      expect(screen.getByTitle('Clear token')).toBeInTheDocument();
    });
  });

  it('should clear token when clear button is clicked', async () => {
    render(<GitHubAuth />);

    const input = screen.getByPlaceholderText('ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx') as HTMLInputElement;
    const token = 'ghp_testtoken123';

    await userEvent.type(input, token);

    await waitFor(() => {
      expect(input.value).toBe(token);
    });

    const clearButton = screen.getByTitle('Clear token');
    await userEvent.click(clearButton);

    expect(input.value).toBe('');
    expect(sessionStorage.getItem('github_token')).toBeNull();
    expect(mockSetCredentials).toHaveBeenCalledWith({ token: undefined });
  });

  it('should show success message when token is saved', async () => {
    render(<GitHubAuth />);

    const input = screen.getByPlaceholderText('ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');

    // Success message should not be visible initially
    expect(screen.queryByText('Token saved (session only)')).not.toBeInTheDocument();

    await userEvent.type(input, 'ghp_testtoken123');

    // Success message should appear
    await waitFor(() => {
      expect(screen.getByText('Token saved (session only)')).toBeInTheDocument();
    });
  });

  it('should remove token from sessionStorage when cleared', async () => {
    render(<GitHubAuth />);

    const input = screen.getByPlaceholderText('ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');
    await userEvent.type(input, 'ghp_testtoken123');

    expect(sessionStorage.getItem('github_token')).toBe('ghp_testtoken123');

    await userEvent.clear(input);

    expect(sessionStorage.getItem('github_token')).toBeNull();
  });

  it('should update credentials in store when token is cleared', async () => {
    render(<GitHubAuth />);

    const input = screen.getByPlaceholderText('ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');
    await userEvent.type(input, 'ghp_testtoken123');

    mockSetCredentials.mockClear();

    await userEvent.clear(input);

    await waitFor(() => {
      expect(mockSetCredentials).toHaveBeenCalledWith({ token: undefined });
    });
  });

  it('should have proper accessibility attributes', () => {
    render(<GitHubAuth />);

    const input = screen.getByPlaceholderText('ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');
    expect(input).toHaveAttribute('id', 'github-token');
  });

  it('should display security message in info panel', async () => {
    render(<GitHubAuth />);

    const toggleButton = screen.getByLabelText('Toggle token information');
    await userEvent.click(toggleButton);

    expect(screen.getByText(/Your token is stored securely in your browser session/i)).toBeInTheDocument();
  });

  it('should not show success message when token is empty', () => {
    render(<GitHubAuth />);

    expect(screen.queryByText('Token saved (session only)')).not.toBeInTheDocument();
  });

  it('should handle rapid token changes', async () => {
    render(<GitHubAuth />);

    const input = screen.getByPlaceholderText('ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');

    await userEvent.type(input, 'ghp_token1');
    await userEvent.clear(input);
    await userEvent.type(input, 'ghp_token2');

    await waitFor(() => {
      expect(sessionStorage.getItem('github_token')).toBe('ghp_token2');
    });
  });
});
