import { fileURLToPath } from 'node:url';
import { chromium, expect } from '@playwright/test';

// Build the packages and start the e2e Vite fixture server before running this script.
const baseURL = process.env.DEVTOOLS_FIXTURE_URL ?? 'http://127.0.0.1:4178';
const output = (name) =>
  fileURLToPath(new URL(`../../../docs/public/${name}`, import.meta.url));
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
    reducedMotion: 'reduce',
  });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${baseURL}/docs-demo.html`);
  await expect(
    page.getByText('Docs demo ready', { exact: true }),
  ).toBeVisible();
  await page.evaluate(() => {
    document.body.style.background = '#edf0f5';
  });
  await page
    .getByRole('button', { name: 'Toggle ViewModel Devtools', exact: true })
    .click();
  const dialog = page.getByRole('dialog', {
    name: 'ViewModel Devtools',
    exact: true,
  });
  await expect(dialog.getByText('13 live', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Dark theme', exact: true }).click();
  await page
    .getByRole('checkbox', { name: 'Show internals', exact: true })
    .uncheck();
  await page
    .getByRole('checkbox', { name: 'Highlight updates', exact: true })
    .uncheck();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(
    dialog.getByText('DocsDemoNavBreadcrumbVM', { exact: true }),
  ).toBeVisible();
  await page.mouse.move(0, 0);
  await dialog.screenshot({
    path: output('devtools-screen-1.png'),
    animations: 'disabled',
  });

  await page
    .getByRole('textbox', { name: 'Search ViewModels and properties' })
    .fill('docs-demo-counter');
  const count = page
    .locator('[data-depth]')
    .filter({ has: page.getByText('count', { exact: true }) });
  await expect(count.getByText('42', { exact: true })).toBeVisible();
  await count.hover();
  await count.getByTitle('Watch property changes', { exact: true }).click();
  for (const value of ['43', '44']) {
    await count.hover();
    await count.getByTitle('Edit', { exact: true }).click();
    await count.getByRole('textbox').fill(value);
    await count.getByRole('textbox').press('Enter');
    await expect(count.getByText(value, { exact: true })).toBeVisible();
  }
  await expect(
    page.getByText('watch history (3)', { exact: true }),
  ).toBeVisible();
  const handle = await page
    .locator('[data-resize-handle="bottom"]')
    .boundingBox();
  if (!handle) throw new Error('Missing popup resize handle');
  await page.mouse.move(
    handle.x + handle.width / 2,
    handle.y + handle.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    handle.x + handle.width / 2,
    handle.y + handle.height / 2 - 300,
    { steps: 6 },
  );
  await page.mouse.up();
  await page.mouse.move(0, 0);
  await dialog.screenshot({
    path: output('devtools-screen-2.png'),
    animations: 'disabled',
  });
  if (errors.length) throw new Error(errors.join('\n'));
  console.log(
    'Captured the connected VM tree and counter search/watch history from the actual docs demo.',
  );
} finally {
  await browser.close();
}
