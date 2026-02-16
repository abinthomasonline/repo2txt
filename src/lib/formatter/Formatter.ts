/**
 * Output formatter
 * Generates formatted text output with directory tree and file contents
 */

import { encode } from 'gpt-tokenizer';
import { getTokenizerWorker } from './TokenizerWorker';
import type { TreeNode, FileContent, FormattedOutput } from '@/types';

export class Formatter {
  /**
   * Format tree structure and file contents into output text (synchronous)
   * @deprecated Use formatAsync for better performance
   */
  static format(tree: TreeNode[], fileContents: FileContent[]): FormattedOutput {
    const directoryTree = this.generateDirectoryTree(tree);
    const fileContentsText = this.generateFileContents(fileContents);

    const fullOutput = `${directoryTree}\n\n${fileContentsText}`;

    return {
      directoryTree,
      fileContents: fileContentsText,
      tokenCount: this.countTokens(fullOutput),
      lineCount: fullOutput.split('\n').length,
    };
  }

  /**
   * Format tree structure and file contents into output text (async with Web Worker)
   */
  static async formatAsync(
    tree: TreeNode[],
    fileContents: FileContent[],
    onProgress?: (progress: number, current: number, total: number) => void
  ): Promise<FormattedOutput> {
    const directoryTree = this.generateDirectoryTree(tree);

    // Tokenize files in batch using Web Worker
    const worker = getTokenizerWorker();
    const filesToTokenize = fileContents.map((file) => ({
      path: file.path,
      content: file.text,
    }));

    const { totalTokens, files } = await worker.tokenizeBatch(
      filesToTokenize,
      onProgress
    );

    // Update file contents with token counts
    const updatedContents = fileContents.map((file, index) => ({
      ...file,
      tokenCount: files[index].tokenCount,
      lineCount: files[index].lineCount,
    }));

    const fileContentsText = this.generateFileContents(updatedContents);
    const fullOutput = `${directoryTree}\n\n${fileContentsText}`;

    // Count tokens for directory tree (small, can be synchronous)
    const treeTokens = this.countTokens(directoryTree);

    return {
      directoryTree,
      fileContents: fileContentsText,
      tokenCount: treeTokens + totalTokens,
      lineCount: fullOutput.split('\n').length,
      files: updatedContents,
    };
  }

  /**
   * Generate ASCII directory tree
   */
  private static generateDirectoryTree(nodes: TreeNode[]): string {
    const lines: string[] = ['Directory Structure:', '---'];

    function traverse(nodes: TreeNode[], prefix: string = '', isLast: boolean = true) {
      nodes.forEach((node, index) => {
        const isLastNode = index === nodes.length - 1;
        const connector = isLastNode ? '└── ' : '├── ';
        const icon = node.type === 'directory' ? '📁' : '📄';

        lines.push(`${prefix}${connector}${icon} ${node.name}`);

        if (node.type === 'directory' && node.children && node.children.length > 0) {
          const newPrefix = prefix + (isLastNode ? '    ' : '│   ');
          traverse(node.children, newPrefix, isLastNode);
        }
      });
    }

    traverse(nodes);
    return lines.join('\n');
  }

  /**
   * Generate file contents section
   */
  private static generateFileContents(contents: FileContent[]): string {
    if (contents.length === 0) {
      return 'No files selected.';
    }

    const sections: string[] = ['File Contents:', '---'];

    contents.forEach((file) => {
      sections.push('');
      sections.push(`File: ${file.path}`);
      sections.push(`Lines: ${file.lineCount}`);
      if (file.tokenCount) {
        sections.push(`Tokens: ${file.tokenCount}`);
      }
      sections.push('---');
      sections.push(file.text);
      sections.push('');
    });

    return sections.join('\n');
  }

  /**
   * Count tokens using GPT tokenizer
   */
  private static countTokens(text: string): number {
    try {
      return encode(text).length;
    } catch (error) {
      console.error('Error counting tokens:', error);
      return 0;
    }
  }

  /**
   * Generate markdown format (alternative format)
   */
  static formatMarkdown(tree: TreeNode[], fileContents: FileContent[]): string {
    const sections: string[] = ['# Repository Contents', ''];

    // Directory structure
    sections.push('## Directory Structure', '');
    sections.push('```');
    sections.push(this.generateDirectoryTree(tree).split('\n').slice(2).join('\n'));
    sections.push('```', '');

    // File contents
    sections.push('## File Contents', '');

    fileContents.forEach((file) => {
      sections.push(`### ${file.path}`, '');

      // Detect language from extension
      const ext = file.path.split('.').pop() || '';
      const lang = this.getLanguageFromExtension(ext);

      sections.push(`\`\`\`${lang}`);
      sections.push(file.text);
      sections.push('```', '');
    });

    return sections.join('\n');
  }

  /**
   * Get language identifier for syntax highlighting
   */
  private static getLanguageFromExtension(ext: string): string {
    const languageMap: Record<string, string> = {
      ts: 'typescript',
      tsx: 'typescript',
      js: 'javascript',
      jsx: 'javascript',
      py: 'python',
      rb: 'ruby',
      go: 'go',
      rs: 'rust',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      cs: 'csharp',
      php: 'php',
      swift: 'swift',
      kt: 'kotlin',
      md: 'markdown',
      json: 'json',
      yaml: 'yaml',
      yml: 'yaml',
      xml: 'xml',
      html: 'html',
      css: 'css',
      scss: 'scss',
      sql: 'sql',
      sh: 'bash',
      bash: 'bash',
    };

    return languageMap[ext.toLowerCase()] || ext;
  }
}
