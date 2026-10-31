import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
});

test('renders the connected extras in the inspector', async ({ page }) => {
  await page.goto('/');

  const header = page.locator('[data-content-header]');
  await expect(header).toBeVisible();
  await expect(page.getByText('Extras', { exact: true })).toBeVisible();
  await expect(page.getByText('accountName', { exact: true })).toBeVisible();
  await expect(page.getByText('preferences', { exact: true })).toBeVisible();

  await expect(page).toHaveScreenshot('devtools-inspector.png', {
    fullPage: true,
  });
});

test('shows a nested property search result', async ({ page }) => {
  await page.goto('/');

  const search = page.getByPlaceholder(
    'search by property path or ViewModel name',
  );

  await search.fill('preferences.theme');
  await expect(page.getByText('theme', { exact: true }).last()).toBeVisible();
  await expect(page.getByText('"dark"', { exact: true })).toBeVisible();

  await expect(page).toHaveScreenshot('devtools-nested-search.png', {
    fullPage: true,
  });
});
