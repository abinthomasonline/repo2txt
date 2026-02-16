import { test, expect } from '@playwright/test';
import { testConfig } from '../test-config';

test.describe('Dark Mode', () => {
  test.beforeEach(async ({ page }) => {
    // Add GitHub token BEFORE navigating to avoid rate limiting
    await page.addInitScript((token) => {
      if (token) {
        sessionStorage.setItem('github_token', token);
      }
    }, testConfig.githubToken);

    await page.goto('/');
    // Wait for app to be fully loaded
    await page.waitForLoadState('networkidle');
  });

  test('should toggle between light, dark, and system modes', async ({ page }) => {
    // Find theme toggle button using data-testid
    const themeButton = page.getByTestId('theme-toggle');
    await expect(themeButton).toBeVisible({ timeout: 10000 });

    // Get initial theme (defaults to system)
    const html = page.locator('html');
    const themeLabel = page.getByTestId('theme-label');

    // Verify initial state is System
    await expect(themeLabel).toContainText(/System/);

    // Click to cycle through themes
    // System → Light
    await themeButton.click();
    await page.waitForTimeout(300); // Wait for theme to apply
    await expect(themeLabel).toContainText(/Light/);
    await expect(html).toHaveClass(/light/);

    // Light → Dark
    await themeButton.click();
    await page.waitForTimeout(300);
    await expect(themeLabel).toContainText(/Dark/);
    await expect(html).toHaveClass(/dark/);

    // Dark → System
    await themeButton.click();
    await page.waitForTimeout(300);
    await expect(themeLabel).toContainText(/System/);
  });

  test('should persist theme preference across page reloads', async ({ page }) => {
    // Find theme toggle
    const themeButton = page.getByTestId('theme-toggle');
    await expect(themeButton).toBeVisible({ timeout: 10000 });
    const themeLabel = page.getByTestId('theme-label');

    // Start with System, click twice to get to Dark (System → Light → Dark)
    await themeButton.click(); // System → Light
    await page.waitForTimeout(300);
    await themeButton.click(); // Light → Dark
    await page.waitForTimeout(500); // Wait for theme to apply
    const html = page.locator('html');
    await expect(html).toHaveClass(/dark/);
    await expect(themeLabel).toContainText(/Dark/);

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify dark mode persists
    await page.waitForTimeout(500); // Wait for theme to initialize
    const htmlAfterReload = page.locator('html');
    await expect(htmlAfterReload).toHaveClass(/dark/);
    const themeLabelAfterReload = page.getByTestId('theme-label');
    await expect(themeLabelAfterReload).toContainText(/Dark/);
  });

  test('should apply dark mode styles to all components', async ({ page }) => {
    // Set to dark mode (System → Light → Dark)
    const themeButton = page.getByTestId('theme-toggle');
    await expect(themeButton).toBeVisible({ timeout: 10000 });
    await themeButton.click(); // System → Light
    await page.waitForTimeout(300);
    await themeButton.click(); // Light → Dark
    await page.waitForTimeout(300); // Wait for theme to apply

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

    // Wait for file tree using data-testid
    await expect(page.getByTestId('file-tree-heading')).toBeVisible({ timeout: 15000 });

    // Verify file tree has dark styles
    const fileTree = page.getByTestId('file-tree');
    await expect(fileTree).toBeVisible();
  });

  test('should maintain dark mode during navigation and interactions', async ({ page }) => {
    // Set to dark mode (System → Light → Dark)
    const themeButton = page.getByTestId('theme-toggle');
    await expect(themeButton).toBeVisible({ timeout: 10000 });
    await themeButton.click(); // System → Light
    await page.waitForTimeout(300);
    await themeButton.click(); // Light → Dark
    await page.waitForTimeout(300); // Wait for theme to apply

    const html = page.locator('html');
    await expect(html).toHaveClass(/dark/);

    // Switch between providers using data-testid
    await page.getByTestId('provider-tab-local').click();
    await page.waitForTimeout(500); // Wait for provider to load
    await expect(html).toHaveClass(/dark/); // Still dark

    await page.getByTestId('provider-tab-github').click();
    await page.waitForTimeout(500); // Wait for provider to load
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
    const themeButton = page.getByTestId('theme-toggle');
    await expect(themeButton).toBeVisible({ timeout: 10000 });
    const themeLabel = page.getByTestId('theme-label');

    // Check initial system mode
    await expect(themeLabel).toContainText(/System/);

    // Switch to light, check icon
    await themeButton.click();
    await page.waitForTimeout(300);
    await expect(themeLabel).toContainText(/Light/);

    // Switch to dark, check icon
    await themeButton.click();
    await page.waitForTimeout(300);
    await expect(themeLabel).toContainText(/Dark/);

    // Switch back to system, check icon
    await themeButton.click();
    await page.waitForTimeout(300);
    await expect(themeLabel).toContainText(/System/);
  });
});
