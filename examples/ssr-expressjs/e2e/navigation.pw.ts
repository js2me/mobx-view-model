import { expect, test, type Page } from '@playwright/test';

async function expectPage(page: Page, path: string, title: string) {
  await expect(page).toHaveURL(new URL(path, page.url()).href);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
}

function collectBrowserErrors(page: Page, expected404URL?: string) {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() !== 'error') return;
    // Chromium also logs the HTTP status of the intentionally missing document.
    if (message.location().url === expected404URL &&
        message.text() === 'Failed to load resource: the server responded with a status of 404 (Not Found)') return;
    errors.push(message.text());
  });
  return errors;
}

test('cart and committed page payload survive browser history and reload', async ({ page }) => {
  const errors = collectBrowserErrors(page);
  await page.goto('/');
  await expectPage(page, '/', 'Catalog');
  await page.getByRole('link', { name: 'Notebook' }).click();
  await expectPage(page, '/product', 'Notebook');
  await page.getByRole('button', { name: 'Add to cart' }).click();
  await expect(page.getByRole('button', { name: 'In cart' })).toBeVisible();
  await page.getByRole('link', { name: 'Cart', exact: true }).click();
  await expectPage(page, '/cart', 'Cart');
  await expect(page.getByText('1 × Notebook')).toBeVisible();

  await page.goBack();
  await expectPage(page, '/product', 'Notebook');
  await expect(page.getByRole('button', { name: 'In cart' })).toBeVisible();
  await page.goBack();
  await expectPage(page, '/', 'Catalog');
  await page.goForward();
  await expectPage(page, '/product', 'Notebook');
  await page.goForward();
  await expectPage(page, '/cart', 'Cart');
  await page.reload();
  await expectPage(page, '/cart', 'Cart');
  await expect(page.getByText('1 × Notebook')).toBeVisible();

  for (const [path, title] of [['/category', 'Stationery'], ['/profile', 'Profile']]) {
    await page.getByRole('link', { name: title }).click();
    await expectPage(page, path, title);
  }
  expect(errors).toEqual([]);
});

test('server-rendered content survives hydration on a direct 404', async ({ page, baseURL }) => {
  const errors = collectBrowserErrors(page, new URL('/missing', baseURL).href);
  // Hold the client bundle until the assertion has seen the server HTML.
  let hydrate!: () => void;
  const gate = new Promise<void>(resolve => { hydrate = resolve; });
  await page.route('**/client.js', async route => { await gate; await route.continue(); });
  const response = await page.goto('/missing', { waitUntil: 'commit' });
  try {
    expect(response?.status()).toBe(404);
    await expectPage(page, '/missing', 'Page not found');
    await expect(page.getByLabel('Client ticks')).toHaveText('0');
  } finally {
    hydrate();
  }
  await expect(page.getByLabel('Client ticks')).toHaveText(/^[1-9]\d*$/);
  await page.getByRole('link', { name: 'Notebook' }).click();
  await page.getByRole('button', { name: 'Add to cart' }).click();
  await expect(page.getByRole('button', { name: 'In cart' })).toBeVisible();
  expect(errors).toEqual([]);
});
