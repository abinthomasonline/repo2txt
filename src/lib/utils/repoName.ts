/**
 * Utility functions for extracting repository names from various sources
 */

/**
 * Sanitize a filename by removing invalid characters
 */
export function sanitizeFilename(name: string): string {
  return name
    // eslint-disable-next-line no-control-regex
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-') // Replace invalid chars with dash
    .replace(/\s+/g, '-') // Replace whitespace with dash
    .replace(/-+/g, '-') // Replace multiple dashes with single dash
    .replace(/^-|-$/g, ''); // Remove leading/trailing dashes
}

/**
 * Extract repository name from GitHub URL
 * Examples:
 * - https://github.com/facebook/react -> react
 * - https://github.com/facebook/react/tree/main -> react
 * - https://github.com/facebook/react/tree/main/packages -> react
 */
export function extractGitHubRepoName(url: string): string {
  try {
    const urlObj = new URL(url);
    const parts = urlObj.pathname.split('/').filter(Boolean);

    if (parts.length >= 2) {
      // parts[0] is owner, parts[1] is repo name
      const repoName = parts[1];
      return sanitizeFilename(repoName);
    }
  } catch {
    // Invalid URL
  }
  return 'github-repo';
}

/**
 * Extract repository name from GitLab URL
 * Examples:
 * - https://gitlab.com/gitlab-org/gitlab -> gitlab
 * - https://gitlab.com/gitlab-org/gitlab-foss/-/tree/master -> gitlab-foss
 */
export function extractGitLabRepoName(url: string): string {
  try {
    const urlObj = new URL(url);
    const parts = urlObj.pathname.split('/').filter(Boolean);

    // Find the repo name (last part before /-/ or tree)
    const treeIndex = parts.indexOf('-');
    const repoPartIndex = treeIndex > 0 ? treeIndex - 1 : parts.length - 1;

    if (repoPartIndex >= 0) {
      const repoName = parts[repoPartIndex];
      return sanitizeFilename(repoName);
    }
  } catch {
    // Invalid URL
  }
  return 'gitlab-repo';
}

/**
 * Extract repository name from Azure DevOps URL
 * Examples:
 * - https://dev.azure.com/org/project/_git/repo -> repo
 * - https://org.visualstudio.com/project/_git/repo -> repo
 */
export function extractAzureRepoName(url: string): string {
  try {
    const urlObj = new URL(url);
    const parts = urlObj.pathname.split('/').filter(Boolean);

    // Find _git index
    const gitIndex = parts.indexOf('_git');
    if (gitIndex >= 0 && gitIndex + 1 < parts.length) {
      const repoName = parts[gitIndex + 1];
      return sanitizeFilename(repoName);
    }
  } catch {
    // Invalid URL
  }
  return 'azure-repo';
}

/**
 * Extract folder name from local upload
 * For directory: use the first directory name
 * For zip: use the zip filename without extension
 */
export function extractLocalName(files: FileList | File): string {
  if (files instanceof File) {
    // Zip file
    const name = files.name.replace(/\.zip$/i, '');
    return sanitizeFilename(name);
  }

  // Directory upload - find the common root directory
  if (files.length > 0) {
    const firstPath = files[0].webkitRelativePath || files[0].name;
    const rootDir = firstPath.split('/')[0];
    if (rootDir) {
      return sanitizeFilename(rootDir);
    }
  }

  return 'local-files';
}

/**
 * Get a safe default filename with timestamp
 */
export function getDefaultFilename(prefix: string = 'repo'): string {
  const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return `${sanitizeFilename(prefix)}-${timestamp}`;
}
