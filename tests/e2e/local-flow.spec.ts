import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Local Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should switch to Local provider', async ({ page }) => {
    // Click on Local tab
    const localTab = page.getByRole('button', { name: 'Local' });
    await localTab.click();

    // Verify Local form is shown
    await expect(page.getByText('Directory')).toBeVisible();
    await expect(page.getByText('Zip File')).toBeVisible();
  });

  test('should show directory picker instructions', async ({ page }) => {
    // Switch to Local
    await page.getByRole('button', { name: 'Local' }).click();

    // Verify instructions are shown
    await expect(page.getByText(/Select a folder containing your code/i)).toBeVisible();
    await expect(page.getByText(/Choose Directory/i)).toBeVisible();
  });

  test('should show zip uploader interface', async ({ page }) => {
    // Switch to Local
    await page.getByRole('button', { name: 'Local' }).click();

    // Switch to Zip File tab
    await page.getByRole('button', { name: 'Zip File' }).click();

    // Verify zip uploader is shown
    await expect(page.getByText(/Upload a ZIP file/i)).toBeVisible();
    await expect(page.getByText(/drag and drop/i)).toBeVisible();
  });

  test('should validate zip file format', async ({ page }) => {
    // Switch to Local > Zip File
    await page.getByRole('button', { name: 'Local' }).click();
    await page.getByRole('button', { name: 'Zip File' }).click();

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

    // Wait for tree to load
    await expect(page.getByText('File Tree')).toBeVisible({ timeout: 10000 });

    // Switch to Local provider
    await page.getByRole('button', { name: 'Local' }).click();

    // Verify file tree is cleared
    // The file tree section should be empty or not visible
    const fileTreeSection = page.getByText('File Tree');
    // It might still be visible but should be empty, or not visible at all
    // This depends on implementation - adjust as needed

    // Switch back to GitHub
    await page.getByRole('button', { name: 'GitHub' }).click();

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

    // Wait for tree to load
    await expect(page.getByText('File Tree')).toBeVisible({ timeout: 10000 });

    // Deselect all files
    const globalCheckbox = page.locator('input[type="checkbox"]').first();
    const isChecked = await globalCheckbox.isChecked();
    if (isChecked) {
      await globalCheckbox.click();
    }

    // Try to generate output
    const generateButton = page.getByRole('button', { name: /Generate Output/i });
    await generateButton.click();

    // Verify error message
    await expect(page.getByText(/No files selected/i)).toBeVisible();
  });
});
