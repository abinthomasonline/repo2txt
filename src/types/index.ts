/**
 * Core type definitions for repo2txt v2.0
 */

export type ProviderType = 'github' | 'local' | 'gitlab' | 'azure';

export type Theme = 'light' | 'dark' | 'system';

export interface FileNode {
  path: string;
  type: 'blob' | 'tree';
  url?: string;
  urlType?: 'api' | 'directory' | 'zip';
  size?: number;
  sha?: string;
}

export interface FileContent {
  path: string;
  text: string;
  url?: string;
  lineCount?: number;
  tokenCount?: number;
}

export interface RepoMetadata {
  type: ProviderType;
  name: string;
  owner?: string;
  branch?: string;
  path?: string;
  url?: string;
}

export interface ProviderCredentials {
  token?: string;
  username?: string;
  password?: string;
  instanceUrl?: string;
}

export interface FetchOptions {
  branch?: string;
  path?: string;
  credentials?: ProviderCredentials;
}

export interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: TreeNode[];
  selected?: boolean;
  visible?: boolean;
  excluded?: boolean;
}

export interface GitIgnorePattern {
  pattern: string;
  isNegation: boolean;
  isDirectory: boolean;
  regex: RegExp;
}

export interface ExtensionFilter {
  extension: string;
  count: number;
  selected: boolean;
}

export interface FormattedOutput {
  directoryTree: string;
  fileContents: string;
  tokenCount: number;
  lineCount: number;
}

export interface ErrorInfo {
  message: string;
  code?: string;
  userMessage: string;
  recovery?: () => void;
}
