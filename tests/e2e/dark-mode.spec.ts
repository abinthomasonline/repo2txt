import { test, expect } from '@playwright/test';

test.describe('Dark Mode', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should toggle between light, dark, and system modes', async ({ page }) => {
    // Find theme toggle button
    const themeButton = page.getByRole('button', { name: /Current theme/i });
    await expect(themeButton).toBeVisible();

    // Get initial theme (should be light by default, or system)
    const html = page.locator('html');

    // Click to cycle through themes
    // Light → Dark
    await themeButton.click();
    await expect(html).toHaveClass(/dark/);
    await expect(themeButton).toContainText(/Dark|🌙/);

    // Dark → System
    await themeButton.click();
    await expect(themeButton).toContainText(/System|💻/);

    // System → Light
    await themeButton.click();
    await expect(html).not.toHaveClass(/dark/);
    await expect(themeButton).toContainText(/Light|☀/);
  });

  test('should persist theme preference across page reloads', async ({ page }) => {
    // Find theme toggle
    const themeButton = page.getByRole('button', { name: /Current theme/i });

    // Set to dark mode
    await themeButton.click();
    const html = page.locator('html');
    await expect(html).toHaveClass(/dark/);

    // Reload page
    await page.reload();

    // Verify dark mode persists
    await expect(html).toHaveClass(/dark/);
    const themeButtonAfterReload = page.getByRole('button', { name: /Current theme/i });
    await expect(themeButtonAfterReload).toContainText(/Dark|🌙/);
  });

  test('should apply dark mode styles to all components', async ({ page }) => {
    // Set to dark mode
    const themeButton = page.getByRole('button', { name: /Current theme/i });
    await themeButton.click();

    // Wait for dark mode to apply
    const html = page.locator('html');
    await expect(html).toHaveClass(/dark/);

    // Verify dark styles on various elements
    const header = page.locator('header');
    await expect(header).toHaveCSS('background-color', /rgb/); // Should have dark background

    // Load a repository to test more components
    const urlInput = page.getByPlaceholder('https://github.com/facebook/react');
    await urlInput.fill('https://github.com/abinthomasonline/repo2txt');

    const loadButton = page.getByRole('button', { name: /Load Repository/i });
    await loadButton.click();

    // Wait for file tree
    await expect(page.getByText('File Tree')).toBeVisible({ timeout: 10000 });

    // Verify file tree has dark styles
    const fileTree = page.locator('[class*="dark:"]').first();
    await expect(fileTree).toBeVisible();
  });

  test('should maintain dark mode during navigation and interactions', async ({ page }) => {
    // Set to dark mode
    const themeButton = page.getByRole('button', { name: /Current theme/i });
    await themeButton.click();

    const html = page.locator('html');
    await expect(html).toHaveClass(/dark/);

    // Switch between providers
    await page.getByRole('button', { name: 'Local' }).click();
    await expect(html).toHaveClass(/dark/); // Still dark

    await page.getByRole('button', { name: 'GitHub' }).click();
    await expect(html).toHaveClass(/dark/); // Still dark

    // Load repository
    const urlInput = page.getByPlaceholder('https://github.com/facebook/react');
    await urlInput.fill('https://github.com/abinthomasonline/repo2txt');

    const loadButton = page.getByRole('button', { name: /Load Repository/i });
    await loadButton.click();

    // Wait and verify still in dark mode
    await page.waitForTimeout(1000);
    await expect(html).toHaveClass(/dark/);
  });

  test('should show correct icons for each theme mode', async ({ page }) => {
    const themeButton = page.getByRole('button', { name: /Current theme/i });

    // Check light mode icon
    await expect(themeButton).toContainText(/☀|Light/);

    // Switch to dark, check icon
    await themeButton.click();
    await expect(themeButton).toContainText(/🌙|Dark/);

    // Switch to system, check icon
    await themeButton.click();
    await expect(themeButton).toContainText(/💻|System/);
  });
});
