import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FileStats } from '../FileStats';
import type { FileContent } from '@/types';

describe('FileStats', () => {
  const mockFiles: FileContent[] = [
    {
      path: 'src/index.ts',
      text: 'console.log("hello")',
      tokenCount: 150,
      lineCount: 50,
    },
    {
      path: 'src/App.tsx',
      text: 'export function App() {}',
      tokenCount: 300,
      lineCount: 100,
    },
    {
      path: 'src/utils.ts',
      text: 'export const add = (a, b) => a + b',
      tokenCount: 75,
      lineCount: 25,
    },
  ];

  it('should render collapsed with per-file details hidden', () => {
    render(<FileStats files={mockFiles} />);

    expect(screen.getByText('Largest files')).toBeInTheDocument();

    // But per-file details should be hidden
    expect(screen.queryByText('src/App.tsx')).not.toBeInTheDocument();
  });

  it('should show per-file details when expanded', async () => {
    render(<FileStats files={mockFiles} />);

    // Per-file details should be hidden initially
    expect(screen.queryByText('src/App.tsx')).not.toBeInTheDocument();

    // Expand the component
    await userEvent.click(screen.getByText('Largest files'));

    // Should now show per-file details
    expect(screen.getByText('src/App.tsx')).toBeInTheDocument();
    expect(screen.getByText('src/index.ts')).toBeInTheDocument();
    expect(screen.getByText('src/utils.ts')).toBeInTheDocument();
  });

  it('should render files sorted by token count when expanded', async () => {
    const { container } = render(<FileStats files={mockFiles} />);

    // Expand the component
    await userEvent.click(screen.getByText('Largest files'));

    // Check that App.tsx (300 tokens) appears before index.ts (150 tokens)
    const paths = Array.from(container.querySelectorAll('[title]')).map((el) => el.textContent);
    expect(paths).toEqual(['src/App.tsx', 'src/index.ts', 'src/utils.ts']);
  });

  it('should display per-file token and line counts when expanded', async () => {
    render(<FileStats files={mockFiles} />);

    // Expand the component
    await userEvent.click(screen.getByText('Largest files'));

    expect(screen.getByTitle('src/App.tsx').parentElement?.textContent).toContain(
      '300 tokens · 100 lines'
    );
    expect(screen.getByTitle('src/index.ts').parentElement?.textContent).toContain(
      '150 tokens · 50 lines'
    );
  });

  it('should not render when no files', () => {
    const { container } = render(<FileStats files={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('should not render when files have no token counts', () => {
    const filesWithoutTokens: FileContent[] = [
      {
        path: 'src/index.ts',
        text: 'console.log("hello")',
      },
    ];

    const { container } = render(<FileStats files={filesWithoutTokens} />);
    expect(container.firstChild).toBeNull();
  });

  it('should handle files without line counts', async () => {
    const files: FileContent[] = [
      {
        path: 'src/index.ts',
        text: 'test',
        tokenCount: 100,
        // No lineCount
      },
    ];

    render(<FileStats files={files} />);

    // Expand to verify it handles missing lineCount gracefully
    await userEvent.click(screen.getByText('Largest files'));

    expect(screen.getByText('src/index.ts')).toBeInTheDocument();
    expect(screen.getByTitle('src/index.ts').parentElement?.textContent).toContain(
      '100 tokens · — lines'
    );
  });
});
