/**
 * FileNode class representing a file or directory in the tree
 */

import type { FileNode as IFileNode } from '@/types';

export class FileNode {
  path: string;
  type: 'blob' | 'tree';
  url?: string;
  urlType?: 'api' | 'directory' | 'zip';
  size?: number;
  sha?: string;
  selected: boolean = false;
  visible: boolean = true;
  excluded: boolean = false;

  constructor(data: IFileNode) {
    this.path = data.path;
    this.type = data.type;
    this.url = data.url;
    this.urlType = data.urlType;
    this.size = data.size;
    this.sha = data.sha;
  }

  /**
   * Get the file name from the path
   */
  getName(): string {
    const parts = this.path.split('/');
    return parts[parts.length - 1];
  }

  /**
   * Get the directory path (excluding filename)
   */
  getDirectory(): string {
    const parts = this.path.split('/');
    return parts.slice(0, -1).join('/');
  }

  /**
   * Get the file extension
   */
  getExtension(): string {
    const name = this.getName();
    const parts = name.split('.');
    return parts.length > 1 ? '.' + parts[parts.length - 1] : '';
  }

  /**
   * Check if this is a file (blob)
   */
  isFile(): boolean {
    return this.type === 'blob';
  }

  /**
   * Check if this is a directory (tree)
   */
  isDirectory(): boolean {
    return this.type === 'tree';
  }

  /**
   * Get depth level in the tree (number of slashes)
   */
  getDepth(): number {
    return this.path.split('/').length - 1;
  }

  /**
   * Check if this node is a child of the given path
   */
  isChildOf(parentPath: string): boolean {
    return this.path.startsWith(parentPath + '/');
  }

  /**
   * Convert to plain object for serialization
   */
  toJSON(): IFileNode {
    return {
      path: this.path,
      type: this.type,
      url: this.url,
      urlType: this.urlType,
      size: this.size,
      sha: this.sha,
    };
  }
}
