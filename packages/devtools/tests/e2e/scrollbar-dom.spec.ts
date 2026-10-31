import { expect, test } from '@playwright/test';

test('keeps React content attached through empty searches and source replacement', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  const dialog = page.getByRole('dialog', {
    name: 'ViewModel Devtools',
    exact: true,
  });
  const search = page.getByRole('textbox', {
    name: 'Search ViewModels and properties',
  });
  for (let iteration = 0; iteration < 3; iteration++) {
    await search.fill('no-matching-data-481516');
    await expect(
      dialog.getByText('No matching ViewModels or properties', { exact: true }),
    ).toBeVisible();
    await search.fill('');
    await expect(
      dialog.getByText('accountName', { exact: true }),
    ).toBeVisible();
  }
  await page.evaluate(() =>
    (globalThis as any).fixture.devtools.setExtras(undefined),
  );
  await expect(
    dialog.getByText('Connect a ViewModel store to start inspecting.', {
      exact: true,
    }),
  ).toBeVisible();
  await page.evaluate(() => {
    const f = (globalThis as any).fixture;
    f.devtools.setExtras(f.data);
  });
  await expect(dialog.getByText('accountName', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('recovers from an empty search after scrolling a large store', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/large-store.html?count=1000&children=0');
  await page
    .getByRole('button', { name: 'Open devtools', exact: true })
    .click();
  await page.locator('.simplebar-content-wrapper').evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  await expect(page.getByText('project-00999', { exact: true })).toBeVisible();
  const search = page.getByRole('textbox', {
    name: 'Search ViewModels and properties',
  });
  await search.fill('no-matching-data-481516');
  await expect(
    page.getByText('No matching ViewModels or properties', { exact: true }),
  ).toBeVisible();
  await search.fill('project-00999');
  await expect(page.getByText('project-00999', { exact: true })).toBeVisible();
  await expect(
    page.locator('#view-model-devtools [data-depth]'),
  ).not.toHaveCount(0);
  expect(errors).toEqual([]);
});

test('leaves host data-simplebar elements and their DOM ownership untouched', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    document.addEventListener('DOMContentLoaded', () => {
      const host = document.createElement('div');
      host.id = 'host-scrollbar';
      host.dataset.simplebar = '';
      const child = document.createElement('span');
      child.id = 'host-content';
      child.textContent = 'Host-owned content';
      host.append(child);
      document.body.append(host);
    });
  });
  await page.goto('/compatibility.html?core=8&order=host-first');
  await expect(
    page.getByText('CompatibilityVM', { exact: true }),
  ).toBeVisible();
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  await expect(page.locator('#host-scrollbar > #host-content')).toHaveCount(1);
  await expect(page.locator('#host-scrollbar')).toHaveAttribute(
    'data-simplebar',
    '',
  );
  await page.evaluate(() => {
    const host = document.createElement('div');
    host.id = 'later-host-scrollbar';
    host.dataset.simplebar = '';
    host.textContent = 'Later host content';
    document.body.append(host);
  });
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  await expect(
    page.locator('#later-host-scrollbar .simplebar-wrapper'),
  ).toHaveCount(0);
  await expect(page.locator('#later-host-scrollbar')).toHaveAttribute(
    'data-simplebar',
    '',
  );
  expect(errors).toEqual([]);
});

test('preserves focused search suggestions when the viewport reattaches', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  const search = page.getByRole('textbox', {
    name: 'Search ViewModels and properties',
  });
  await search.fill('preferences.th');
  const suggestions = page.getByRole('listbox', { name: 'Search suggestions' });
  await expect(suggestions).toBeVisible();
  await page.evaluate(() => {
    const viewport = (globalThis as any).fixture.devtools.inspector.viewport;
    viewport.attach(viewport.contentRef.current);
  });
  await expect(search).toBeFocused();
  await expect(suggestions).toBeVisible();
  await search.press('Tab');
  await expect(search).toHaveValue('preferences.theme');
  await page
    .getByRole('button', { name: 'Close devtools', exact: true })
    .click();
  expect(
    await page.evaluate(
      () =>
        (globalThis as any).fixture.devtools.searchEngine.isSearchInputFocused,
    ),
  ).toBe(false);
  expect(errors).toEqual([]);
});

test('ignores unsupported store announcements without replacing the connected host store', async ({
  page,
}) => {
  const errors: string[] = [];
  const warnings: string[] = [];
  page.on('console', (message) => {
    if (
      message.type() === 'warning' &&
      message.text().startsWith('[mobx-view-model-devtools] Skipped')
    )
      warnings.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/compatibility.html?core=8&order=host-first');
  await expect(
    page.getByText('CompatibilityVM', { exact: true }),
  ).toBeVisible();
  await page.evaluate(() => {
    const config = (globalThis as any)[Symbol.for('VIEW_MODELS_CONFIG')];
    const unsupported = {
      getIds: () => [],
      get: () => undefined,
      viewModels: { values: () => null },
    };
    config.hooks.storeCreate(unsupported);
    config.hooks.storeCreate(unsupported);
  });
  await expect(
    page.getByText('CompatibilityVM', { exact: true }),
  ).toBeVisible();
  await page.evaluate(() => (globalThis as any).compatibility.add());
  await expect(page.getByText('AddedVM', { exact: true })).toBeVisible();
  expect(warnings).toHaveLength(1);
  expect(warnings[0]).toContain('viewModels.values()');
  expect(errors).toEqual([]);
});
