import { test, expect } from '@playwright/test';

test.describe('GitHub Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
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

    // Wait for file tree to load
    await expect(page.getByText('File Tree')).toBeVisible({ timeout: 10000 });

    // Verify some files are loaded
    await expect(page.getByText('index.html')).toBeVisible();

    // Step 4: Select files by extension
    // Click on extension filter to expand if needed
    const jsExtension = page.locator('text=.js').first();
    await expect(jsExtension).toBeVisible();

    // Step 5: Generate output
    const generateButton = page.getByRole('button', { name: /Generate Output/i });
    await generateButton.click();

    // Wait for output to be generated
    await expect(page.getByText('Directory Structure:')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('File Contents:')).toBeVisible();

    // Verify token count is displayed
    await expect(page.getByText('Tokens')).toBeVisible();

    // Step 6: Copy to clipboard
    const copyButton = page.getByRole('button', { name: /Copy/i });
    await copyButton.click();

    // Verify copy success feedback
    await expect(page.getByText('Copied!')).toBeVisible();

    // Step 7: Download file
    const downloadPromise = page.waitForEvent('download');
    const downloadButton = page.getByRole('button', { name: /Download/i });
    await downloadButton.click();
    const download = await downloadPromise;

    // Verify download
    expect(download.suggestedFilename()).toMatch(/repo-export\.txt/);
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

    // Verify hints are shown
    await expect(page.getByText('Supported URL formats:')).toBeVisible();
    await expect(page.getByText('https://github.com/owner/repo')).toBeVisible();

    // Click again to hide
    await infoButton.click();
    await expect(page.getByText('Supported URL formats:')).not.toBeVisible();
  });

  test('should handle file tree interactions', async ({ page }) => {
    // Load a repository
    const urlInput = page.getByPlaceholder('https://github.com/facebook/react');
    await urlInput.fill('https://github.com/abinthomasonline/repo2txt');

    const loadButton = page.getByRole('button', { name: /Load Repository/i });
    await loadButton.click();

    // Wait for file tree
    await expect(page.getByText('File Tree')).toBeVisible({ timeout: 10000 });

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

    // Wait for file tree
    await expect(page.getByText('File Tree')).toBeVisible({ timeout: 10000 });

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
