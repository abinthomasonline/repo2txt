import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DirectoryPicker } from '../DirectoryPicker';

describe('DirectoryPicker', () => {
  it('should render select button', () => {
    render(<DirectoryPicker />);

    expect(screen.getByText('Select Directory')).toBeInTheDocument();
  });

  it('should show help text', () => {
    render(<DirectoryPicker />);

    expect(
      screen.getByText('Select a directory from your device to upload all files.')
    ).toBeInTheDocument();
  });

  it('should call onDirectorySelected when files are selected', async () => {
    const onDirectorySelected = vi.fn();
    render(<DirectoryPicker onDirectorySelected={onDirectorySelected} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeTruthy();

    // Mock files
    const file1 = new File(['content1'], 'file1.txt', { type: 'text/plain' });
    const file2 = new File(['content2'], 'file2.txt', { type: 'text/plain' });

    // Create a mock FileList
    const fileList = [file1, file2] as unknown as FileList;
    Object.defineProperty(fileList, 'item', {
      value: (index: number) => fileList[index],
    });
    Object.defineProperty(fileList, 'length', {
      value: 2,
    });

    // Manually trigger change event
    Object.defineProperty(input, 'files', {
      value: fileList,
      configurable: true,
    });

    fireEvent.change(input);

    expect(onDirectorySelected).toHaveBeenCalledWith(fileList);
  });

  it('should show file count when files are selected', async () => {
    render(<DirectoryPicker />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file1 = new File(['content'], 'file1.txt');
    const file2 = new File(['content'], 'file2.txt');

    const fileList = [file1, file2] as unknown as FileList;
    Object.defineProperty(fileList, 'item', {
      value: (index: number) => fileList[index],
    });
    Object.defineProperty(fileList, 'length', {
      value: 2,
    });

    Object.defineProperty(input, 'files', {
      value: fileList,
      configurable: true,
    });

    fireEvent.change(input);

    expect(await screen.findByText('2 files selected')).toBeInTheDocument();
  });

  it('should be disabled when disabled prop is true', () => {
    render(<DirectoryPicker disabled />);

    const button = screen.getByText('Select Directory').closest('button');
    expect(button).toBeDisabled();
  });

  it('should have hidden file input with correct attributes', () => {
    render(<DirectoryPicker />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input).toHaveAttribute('multiple');
    expect(input.className).toContain('hidden');
  });
});
