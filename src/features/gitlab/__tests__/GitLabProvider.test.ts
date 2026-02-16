/**
 * GitLab Provider Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GitLabProvider } from '../GitLabProvider';

describe('GitLabProvider', () => {
  let provider: GitLabProvider;

  beforeEach(() => {
    provider = new GitLabProvider();
  });

  describe('getType', () => {
    it('should return "gitlab"', () => {
      expect(provider.getType()).toBe('gitlab');
    });
  });

  describe('getName', () => {
    it('should return "GitLab"', () => {
      expect(provider.getName()).toBe('GitLab');
    });
  });

  describe('requiresAuth', () => {
    it('should return false (public repos work without auth)', () => {
      expect(provider.requiresAuth()).toBe(false);
    });
  });

  describe('validateUrl', () => {
    it('should accept valid GitLab.com URLs', () => {
      expect(provider.validateUrl('https://gitlab.com/owner/repo')).toBe(true);
      expect(provider.validateUrl('https://gitlab.com/group/subgroup/repo')).toBe(true);
      expect(provider.validateUrl('https://gitlab.com/owner/repo/-/tree/main')).toBe(true);
    });

    it('should accept self-hosted GitLab URLs', () => {
      expect(provider.validateUrl('https://gitlab.example.com/owner/repo')).toBe(true);
      expect(provider.validateUrl('https://git.company.com/team/project')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(provider.validateUrl('https://github.com/owner/repo')).toBe(false);
      expect(provider.validateUrl('https://gitlab.com')).toBe(false);
      expect(provider.validateUrl('not-a-url')).toBe(false);
      expect(provider.validateUrl('')).toBe(false);
    });

    it('should handle URLs with trailing slashes', () => {
      expect(provider.validateUrl('https://gitlab.com/owner/repo/')).toBe(true);
    });
  });

  describe('parseUrl', () => {
    it('should parse simple GitLab URLs', () => {
      const result = provider.parseUrl('https://gitlab.com/owner/repo');
      expect(result.isValid).toBe(true);
      expect(result.owner).toBe('owner');
      expect(result.repo).toBe('repo');
      expect(result.branch).toBeUndefined();
      expect(result.path).toBeUndefined();
    });

    it('should parse GitLab URLs with groups/subgroups', () => {
      const result = provider.parseUrl('https://gitlab.com/group/subgroup/repo');
      expect(result.isValid).toBe(true);
      expect(result.owner).toBe('group/subgroup');
      expect(result.repo).toBe('repo');
    });

    it('should parse GitLab URLs with branch', () => {
      const result = provider.parseUrl('https://gitlab.com/owner/repo/-/tree/main');
      expect(result.isValid).toBe(true);
      expect(result.owner).toBe('owner');
      expect(result.repo).toBe('repo');
      expect(result.branch).toBe('main');
    });

    it('should parse GitLab URLs with branch and path', () => {
      const result = provider.parseUrl('https://gitlab.com/owner/repo/-/tree/develop/src/components');
      expect(result.isValid).toBe(true);
      expect(result.owner).toBe('owner');
      expect(result.repo).toBe('repo');
      expect(result.branch).toBe('develop');
      expect(result.path).toBe('src/components');
    });

    it('should parse self-hosted GitLab URLs', () => {
      const result = provider.parseUrl('https://gitlab.example.com/team/project');
      expect(result.isValid).toBe(true);
      expect(result.owner).toBe('team');
      expect(result.repo).toBe('project');
    });

    it('should return error for invalid URLs', () => {
      const result = provider.parseUrl('https://github.com/owner/repo');
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle trailing slashes', () => {
      const result = provider.parseUrl('https://gitlab.com/owner/repo/');
      expect(result.isValid).toBe(true);
      expect(result.owner).toBe('owner');
      expect(result.repo).toBe('repo');
    });
  });

  describe('setCredentials', () => {
    it('should accept and store credentials', () => {
      const token = 'glpat-test-token';
      provider.setCredentials({ token });
      // Credentials are stored internally, no direct way to verify except through API calls
      expect(() => provider.setCredentials({ token })).not.toThrow();
    });
  });

  describe('reset', () => {
    it('should clear provider state', () => {
      provider.setCredentials({ token: 'test-token' });
      provider.reset();
      // After reset, provider should be in initial state
      expect(provider.getRepoInfo()).toBeNull();
    });
  });
});
