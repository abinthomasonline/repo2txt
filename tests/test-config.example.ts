/**
 * Test configuration template
 * Copy this file to test-config.ts and add your GitHub token
 */

export const testConfig = {
  // GitHub token for E2E tests
  // Without a token, GitHub API limits to 60 requests/hour
  // With a token, you get 5000 requests/hour
  // Generate a token at: https://github.com/settings/tokens
  // Requires 'repo' scope for private repos, or no scopes for public repos only
  githubToken: process.env.GITHUB_TOKEN || '',
};
