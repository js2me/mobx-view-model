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

test('blurs host content behind the mobile popup and launcher', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?backdrop=dark');
  await page.evaluate(() => {
    const backdrop = document.createElement('div');
    backdrop.style.cssText =
      'position:fixed;inset:0;color:white;font:700 48px/1.5 sans-serif;overflow:hidden;pointer-events:none';
    backdrop.textContent = 'Host page content '.repeat(80);
    document.body.prepend(backdrop);
  });
  const dialog = page.getByRole('dialog', {
    name: 'ViewModel Devtools',
    exact: true,
  });
  await expect(dialog).toHaveCSS('backdrop-filter', 'blur(28px) saturate(1.5)');
  await expect(page).toHaveScreenshot('devtools-mobile-backdrop-blur.png');
  await page
    .getByRole('button', { name: 'Close devtools', exact: true })
    .click();
  await expect(
    page.getByRole('button', {
      name: 'Toggle ViewModel Devtools',
      exact: true,
    }),
  ).toHaveCSS('backdrop-filter', 'blur(28px) saturate(1.5)');
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
