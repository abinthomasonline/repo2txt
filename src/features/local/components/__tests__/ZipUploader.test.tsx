import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ZipUploader } from '../ZipUploader';

describe('ZipUploader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render upload zone', () => {
    render(<ZipUploader />);

    expect(screen.getByText(/Click to upload/)).toBeInTheDocument();
    expect(screen.getByText(/or drag and drop/)).toBeInTheDocument();
  });

  it('should show supported formats', () => {
    render(<ZipUploader />);

    expect(screen.getByText(/Supports .zip, .rar, .7z/)).toBeInTheDocument();
  });

  it('should call onFileSelected with valid zip file', async () => {
    const onFileSelected = vi.fn();
    render(<ZipUploader onFileSelected={onFileSelected} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const zipFile = new File(['zip content'], 'test.zip', { type: 'application/zip' });

    await userEvent.upload(input, zipFile);

    expect(onFileSelected).toHaveBeenCalledWith(zipFile);
  });

  it('should show error for unsupported format', async () => {
    render(<ZipUploader />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const txtFile = new File(['text'], 'test.txt', { type: 'text/plain' });

    // Manually trigger change event
    Object.defineProperty(input, 'files', {
      value: [txtFile],
      configurable: true,
    });

    fireEvent.change(input);

    expect(
      await screen.findByText(/Unsupported format/)
    ).toBeInTheDocument();
  });

  it('should show error for large files', async () => {
    render(<ZipUploader />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    // Create a file larger than 100MB
    const largeFile = new File(['x'.repeat(101 * 1024 * 1024)], 'large.zip', {
      type: 'application/zip',
    });

    await userEvent.upload(input, largeFile);

    expect(await screen.findByText(/File is too large/)).toBeInTheDocument();
  });

  it('should display selected file info', async () => {
    render(<ZipUploader />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const zipFile = new File(['content'], 'test.zip', { type: 'application/zip' });

    await userEvent.upload(input, zipFile);

    expect(await screen.findByText('test.zip')).toBeInTheDocument();
  });

  it('should clear selected file when clear button is clicked', async () => {
    const onFileSelected = vi.fn();
    render(<ZipUploader onFileSelected={onFileSelected} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const zipFile = new File(['content'], 'test.zip', { type: 'application/zip' });

    await userEvent.upload(input, zipFile);

    expect(await screen.findByText('test.zip')).toBeInTheDocument();

    const clearButton = screen.getByTitle('Remove file');
    await userEvent.click(clearButton);

    expect(screen.queryByText('test.zip')).not.toBeInTheDocument();
  });

  it('should show drag state when dragging over', () => {
    render(<ZipUploader />);

    const dropZone = screen.getByText(/Click to upload/).closest('div') as HTMLElement;

    fireEvent.dragEnter(dropZone);

    expect(screen.getByText('Drop your zip file here')).toBeInTheDocument();
  });

  it('should handle file drop', async () => {
    const onFileSelected = vi.fn();
    render(<ZipUploader onFileSelected={onFileSelected} />);

    const dropZone = screen.getByText(/Click to upload/).closest('div') as HTMLElement;
    const zipFile = new File(['content'], 'test.zip', { type: 'application/zip' });

    const dataTransfer = {
      files: [zipFile],
    };

    fireEvent.drop(dropZone, { dataTransfer });

    expect(onFileSelected).toHaveBeenCalledWith(zipFile);
  });

  it('should accept .rar and .7z files', async () => {
    const onFileSelected = vi.fn();
    render(<ZipUploader onFileSelected={onFileSelected} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    const rarFile = new File(['rar content'], 'test.rar', { type: 'application/x-rar-compressed' });
    await userEvent.upload(input, rarFile);
    expect(onFileSelected).toHaveBeenCalledWith(rarFile);

    onFileSelected.mockClear();

    const sevenZFile = new File(['7z content'], 'test.7z', { type: 'application/x-7z-compressed' });
    await userEvent.upload(input, sevenZFile);
    expect(onFileSelected).toHaveBeenCalledWith(sevenZFile);
  });

  it('should be disabled when disabled prop is true', () => {
    render(<ZipUploader disabled />);

    const dropZone = screen.getByText(/Click to upload/).closest('div') as HTMLElement;
    expect(dropZone.className).toContain('cursor-not-allowed');
  });

  it('should have hidden file input with correct attributes', () => {
    render(<ZipUploader />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input).toHaveAttribute('accept', '.zip,.rar,.7z');
    expect(input.className).toContain('hidden');
  });
});
