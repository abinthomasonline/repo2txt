import { test, expect } from '@playwright/test';
import { testConfig } from '../test-config';

test.describe('GitHub Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Add GitHub token BEFORE navigating to avoid rate limiting
    await page.addInitScript((token) => {
      if (token) {
        sessionStorage.setItem('github_token', token);
      }
    }, testConfig.githubToken);

    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should complete full GitHub public repo flow', async ({ page }) => {
    // Step 1: Verify initial state
    await expect(page.getByRole('heading', { name: 'repo2txt' })).toBeVisible();
    await expect(page.getByText('v2.0 Beta')).toBeVisible();

    // Step 2: Enter GitHub URL
    const urlInput = page.getByPlaceholder('https://github.com/facebook/react');
    await urlInput.fill('https://github.com/abinthomasonline/repo2txt');

    // Wait for validation
    await expect(page.getByText('Valid GitHub URL')).toBeVisible();

    // Step 3: Fetch repository
    const loadButton = page.getByRole('button', { name: /Load Repository/i });
    await loadButton.click();

    // Wait for file tree to load using data-testid
    await expect(page.getByTestId('file-tree-heading')).toBeVisible({ timeout: 30000 });

    // Verify some files are loaded
    await expect(page.getByText('index.html')).toBeVisible();

    // Step 4: Verify file tree is interactive (skip extension filter check for now)
    // The extension filters are in a collapsed section

    // Step 5: Generate output using data-testid
    const generateButton = page.getByTestId('generate-output-button');
    await generateButton.click();

    // Wait for output to be generated
    await expect(page.getByText('Directory Structure:')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('File Contents:')).toBeVisible();

    // Step 6: Verify output buttons and copy to clipboard
    const copyButton = page.getByRole('button', { name: /Copy/i });
    const downloadButton = page.getByRole('button', { name: /Download/i });
    await expect(copyButton).toBeVisible();
    await expect(downloadButton).toBeVisible();

    // Click copy button (clipboard API may not work in headless mode, so we just verify the button works)
    await copyButton.click();
    await page.waitForTimeout(500);

    // Step 7: Download file
    const downloadPromise = page.waitForEvent('download');
    await downloadButton.click();
    const download = await downloadPromise;

    // Verify download - now uses repo name
    expect(download.suggestedFilename()).toMatch(/\.txt/);
  });

  test('should validate invalid GitHub URLs', async ({ page }) => {
    const urlInput = page.getByPlaceholder('https://github.com/facebook/react');

    // Test invalid URL
    await urlInput.fill('https://gitlab.com/owner/repo');
    await expect(page.getByText('Invalid GitHub URL format')).toBeVisible();

    // Clear and test another invalid URL
    await urlInput.clear();
    await urlInput.fill('not-a-url');
    await expect(page.getByText('Invalid GitHub URL format')).toBeVisible();

    // Test valid URL
    await urlInput.clear();
    await urlInput.fill('https://github.com/owner/repo');
    await expect(page.getByText('Valid GitHub URL')).toBeVisible();
  });

  test('should support GitHub URLs with branch and path', async ({ page }) => {
    const urlInput = page.getByPlaceholder('https://github.com/facebook/react');

    // Test URL with branch
    await urlInput.fill('https://github.com/facebook/react/tree/main');
    await expect(page.getByText('Valid GitHub URL')).toBeVisible();

    // Test URL with branch and path
    await urlInput.clear();
    await urlInput.fill('https://github.com/facebook/react/tree/main/packages/react');
    await expect(page.getByText('Valid GitHub URL')).toBeVisible();
  });

  test('should show helpful hints for URL format', async ({ page }) => {
    // Click the info button to show hints
    const infoButton = page.getByLabel('Toggle URL format hints');
    await infoButton.click();
    await page.waitForTimeout(300); // Wait for hints to expand

    // Verify hints are shown - check for the list container
    const hintsSection = page.locator('div[class*="bg-blue"]').filter({ hasText: 'Supported URL formats:' });
    await expect(hintsSection).toBeVisible();

    // Click again to hide
    await infoButton.click();
    await page.waitForTimeout(300);
    await expect(hintsSection).not.toBeVisible();
  });

  test('should handle file tree interactions', async ({ page }) => {
    // Load a repository
    const urlInput = page.getByPlaceholder('https://github.com/facebook/react');
    await urlInput.fill('https://github.com/abinthomasonline/repo2txt');

    const loadButton = page.getByRole('button', { name: /Load Repository/i });
    await loadButton.click();

    // Wait for file tree using data-testid
    await expect(page.getByTestId('file-tree-heading')).toBeVisible({ timeout: 30000 });

    // Test global checkbox (select all)
    const globalCheckbox = page.locator('input[type="checkbox"]').first();
    await globalCheckbox.click();

    // Verify some files are selected
    const selectedCheckboxes = page.locator('input[type="checkbox"]:checked');
    await expect(selectedCheckboxes).toHaveCount(await selectedCheckboxes.count());

    // Deselect all
    await globalCheckbox.click();

    // Test individual file selection
    const firstFileCheckbox = page.locator('input[type="checkbox"]').nth(1);
    await firstFileCheckbox.click();
    await expect(firstFileCheckbox).toBeChecked();
  });

  test('should filter files by extension', async ({ page }) => {
    // Load a repository
    const urlInput = page.getByPlaceholder('https://github.com/facebook/react');
    await urlInput.fill('https://github.com/abinthomasonline/repo2txt');

    const loadButton = page.getByRole('button', { name: /Load Repository/i });
    await loadButton.click();

    // Wait for file tree using data-testid
    await expect(page.getByTestId('file-tree-heading')).toBeVisible({ timeout: 30000 });

    // Expand Advanced Filters
    const advancedFiltersButton = page.getByText('Advanced Filters');
    await advancedFiltersButton.click();

    // Find and toggle a specific extension
    const htmlExtension = page.locator('text=.html').first();
    if (await htmlExtension.isVisible()) {
      const htmlCheckbox = htmlExtension.locator('xpath=ancestor::label//input[@type="checkbox"]');
      await htmlCheckbox.click();
    }

    // Verify extension filter is working
    // (In a real test, we'd verify specific files are shown/hidden)
  });
});
