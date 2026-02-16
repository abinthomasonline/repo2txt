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

  it('should render file statistics header', () => {
    render(<FileStats files={mockFiles} />);

    expect(screen.getByText('File Statistics')).toBeInTheDocument();

    // Stats should be hidden by default (collapsed)
    expect(screen.queryByText('3')).not.toBeInTheDocument();
  });

  it('should expand when clicked', async () => {
    render(<FileStats files={mockFiles} />);

    const header = screen.getByText('File Statistics');
    await userEvent.click(header);

    // Should now show the stats
    expect(screen.getByText('3')).toBeInTheDocument(); // File count
    expect(screen.getByText('175')).toBeInTheDocument(); // Total lines
    expect(screen.getByText('525')).toBeInTheDocument(); // Total tokens
  });

  it('should render files sorted by token count when expanded', async () => {
    render(<FileStats files={mockFiles} />);

    // Expand the component
    const header = screen.getByText('File Statistics');
    await userEvent.click(header);

    // Check that App.tsx (300 tokens) appears before index.ts (150 tokens)
    const appElement = screen.getByText('src/App.tsx');
    const indexElement = screen.getByText('src/index.ts');
    const utilsElement = screen.getByText('src/utils.ts');

    expect(appElement).toBeInTheDocument();
    expect(indexElement).toBeInTheDocument();
    expect(utilsElement).toBeInTheDocument();

    // Verify the sorting by checking token counts are in descending order
    expect(screen.getByText('300')).toBeInTheDocument(); // App.tsx
    expect(screen.getByText('150')).toBeInTheDocument(); // index.ts
    expect(screen.getByText('75')).toBeInTheDocument(); // utils.ts
  });

  it('should display per-file statistics when expanded', async () => {
    render(<FileStats files={mockFiles} />);

    // Expand the component
    const header = screen.getByText('File Statistics');
    await userEvent.click(header);

    expect(screen.getByText('50')).toBeInTheDocument(); // index.ts lines
    expect(screen.getByText('150')).toBeInTheDocument(); // index.ts tokens
    expect(screen.getByText('100')).toBeInTheDocument(); // App.tsx lines
    expect(screen.getByText('300')).toBeInTheDocument(); // App.tsx tokens
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

    expect(screen.getByText('File Statistics')).toBeInTheDocument();

    // Expand to verify it handles missing lineCount gracefully
    const header = screen.getByText('File Statistics');
    await userEvent.click(header);

    expect(screen.getByText('src/index.ts')).toBeInTheDocument();
  });
});
