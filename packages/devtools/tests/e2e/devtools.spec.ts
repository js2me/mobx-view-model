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

test('renders dark glass over a dark host page', async ({ page }) => {
  await page.goto('/?backdrop=dark');
  await expect(
    page.getByRole('dialog', { name: 'ViewModel Devtools', exact: true }),
  ).toBeVisible();
  await expect(page.locator('#view-model-devtools')).toHaveAttribute(
    'data-vmd-theme',
    'dark',
  );
  await expect(page).toHaveScreenshot('devtools-dark-host.png', {
    fullPage: true,
  });
});

test('keeps the light appearance available', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Light theme', exact: true }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.locator('#view-model-devtools')).toHaveAttribute(
    'data-vmd-theme',
    'light',
  );
  await expect(page).toHaveScreenshot('devtools-light-glass.png', {
    fullPage: true,
  });
});
