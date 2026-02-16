import { test, expect } from '@playwright/test';
import path from 'path';
import { testConfig } from '../test-config';

test.describe('Local Flow', () => {
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

  test('should switch to Local provider', async ({ page }) => {
    // Click on Local tab using data-testid
    const localTab = page.getByTestId('provider-tab-local');
    await localTab.click();
    await page.waitForTimeout(1500); // Wait for provider to load (code splitting)

    // Verify Local form tabs are shown using data-testid
    await expect(page.getByTestId('local-tab-directory')).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('local-tab-zip')).toBeVisible({ timeout: 5000 });
  });

  test('should show directory picker instructions', async ({ page }) => {
    // Switch to Local
    await page.getByTestId('provider-tab-local').click();
    await page.waitForTimeout(1500); // Wait for provider to load

    // Verify instructions are shown (actual text from DirectoryPicker component)
    await expect(page.getByText(/Select a directory from your device/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Select Directory/i)).toBeVisible({ timeout: 5000 });
  });

  test('should show zip uploader interface', async ({ page }) => {
    // Switch to Local
    await page.getByTestId('provider-tab-local').click();
    await page.waitForTimeout(1500); // Wait for provider to load

    // Switch to Zip File tab using data-testid
    await page.getByTestId('local-tab-zip').click();
    await page.waitForTimeout(500);

    // Verify zip uploader is shown (actual text from ZipUploader component)
    await expect(page.getByText(/Click to upload/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/drag and drop/i)).toBeVisible({ timeout: 5000 });
  });

  test('should validate zip file format', async ({ page }) => {
    // Switch to Local > Zip File
    await page.getByTestId('provider-tab-local').click();
    await page.waitForTimeout(1500); // Wait for provider to load
    await page.getByTestId('local-tab-zip').click();
    await page.waitForTimeout(500);

    // Note: Testing actual file upload requires a real zip file
    // This test verifies the UI is ready for file upload
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeAttached();
  });

  test('should reset state when switching providers', async ({ page }) => {
    // Start with GitHub, load a repo
    const urlInput = page.getByPlaceholder('https://github.com/facebook/react');
    await urlInput.fill('https://github.com/abinthomasonline/repo2txt');

    const loadButton = page.getByRole('button', { name: /Load Repository/i });
    await loadButton.click();

    // Wait for tree to load using data-testid
    await expect(page.getByTestId('file-tree-heading')).toBeVisible({ timeout: 30000 });

    // Switch to Local provider
    await page.getByTestId('provider-tab-local').click();
    await page.waitForTimeout(1500); // Wait for provider to load

    // Verify file tree is not visible after switching
    await expect(page.getByTestId('file-tree-heading')).not.toBeVisible();

    // Switch back to GitHub
    await page.getByTestId('provider-tab-github').click();
    await page.waitForTimeout(500);

    // Verify URL input is cleared
    const clearedUrlInput = page.getByPlaceholder('https://github.com/facebook/react');
    await expect(clearedUrlInput).toHaveValue('');
  });

  test('should show error for no files selected', async ({ page }) => {
    // Switch to GitHub (or stay on it)
    const urlInput = page.getByPlaceholder('https://github.com/facebook/react');
    await urlInput.fill('https://github.com/abinthomasonline/repo2txt');

    const loadButton = page.getByRole('button', { name: /Load Repository/i });
    await loadButton.click();

    // Wait for tree to load using data-testid
    await expect(page.getByTestId('file-tree-heading')).toBeVisible({ timeout: 30000 });

    // Deselect all files
    const globalCheckbox = page.locator('input[type="checkbox"]').first();
    const isChecked = await globalCheckbox.isChecked();
    if (isChecked) {
      await globalCheckbox.click();
    }

    // Try to generate output using data-testid
    const generateButton = page.getByTestId('generate-output-button');
    await generateButton.click();

    // Verify error message
    await expect(page.getByText(/No files selected/i)).toBeVisible();
  });
});
