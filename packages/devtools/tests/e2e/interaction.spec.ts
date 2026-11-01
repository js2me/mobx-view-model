import { expect, type Page, test } from '@playwright/test';

const pageErrors = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  pageErrors.set(page, errors);
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.goto('/');
  await expect(
    page.getByRole('dialog', { name: 'ViewModel Devtools', exact: true }),
  ).toBeVisible();
});

const accountRow = (page: import('@playwright/test').Page, key: string) =>
  page
    .locator('[data-depth]')
    .filter({ has: page.getByText(key, { exact: true }) });

test('edits host data and records property history', async ({ page }) => {
  const authenticated = accountRow(page, 'isAuthenticated');
  await authenticated.hover();
  await authenticated
    .getByTitle('Watch property changes', { exact: true })
    .click();
  await expect(
    page.getByText('watch history (1)', { exact: true }),
  ).toBeVisible();
  await authenticated.hover();
  await authenticated.getByTitle('Toggle', { exact: true }).click();
  await expect(authenticated.getByText('false', { exact: true })).toBeVisible();
  await expect(
    page.getByText('watch history (2)', { exact: true }),
  ).toBeVisible();

  const account = accountRow(page, 'accountName');
  await account.hover();
  await account.getByTitle('Edit', { exact: true }).click();
  await account.getByRole('textbox').fill('"Grace Hopper"');
  await account.getByRole('textbox').press('Enter');
  await expect(
    account.getByText('"Grace Hopper"', { exact: true }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => (globalThis as any).fixture.data.accountName),
    )
    .toBe('Grace Hopper');
});

test('reports invalid input without losing the edit or changing the host', async ({
  page,
}) => {
  const preferences = accountRow(page, 'preferences');
  await preferences.hover();
  await preferences.getByTitle('Edit', { exact: true }).click();
  await preferences.getByRole('textbox').fill('{ invalid');
  await preferences.getByRole('textbox').press('Enter');
  await expect(preferences.getByRole('textbox')).toHaveValue('{ invalid');
  await expect(page.getByRole('status')).toContainText('Failed to parse value');
  await expect
    .poll(() =>
      page.evaluate(() => (globalThis as any).fixture.data.preferences.theme),
    )
    .toBe('dark');
  await preferences.getByRole('textbox').press('Escape');
  await expect(preferences.getByRole('textbox')).toHaveCount(0);
});

test('changes settings through their ViewModel and persists user preferences', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const settings = page.getByRole('dialog', { name: 'Settings', exact: true });
  await settings
    .getByRole('button', { name: 'Light theme', exact: true })
    .click();
  await expect(page.locator('#view-model-devtools')).toHaveAttribute(
    'data-vmd-theme',
    'light',
  );
  await settings
    .getByRole('button', { name: 'Dark theme', exact: true })
    .click();
  await settings.getByRole('checkbox', { name: 'Highlight updates' }).uncheck();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page
    .getByRole('button', { name: 'Sort descending', exact: true })
    .click();
  await page.getByRole('button', { name: 'List view', exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(() => ({
        theme: localStorage.getItem('mobx-view-model-devtools:theme'),
        sort: localStorage.getItem('mobx-view-model-devtools/sortPropertiesBy'),
        mode: localStorage.getItem('mobx-view-model-devtools/presentationMode'),
      })),
    )
    .toEqual({ theme: 'dark', sort: '"desc"', mode: '"list"' });
});

test('drags the trigger without toggling and supports keyboard open and close', async ({
  page,
}) => {
  await page
    .getByRole('button', { name: 'Close devtools', exact: true })
    .click();
  const trigger = page.getByRole('button', {
    name: 'Toggle ViewModel Devtools',
    exact: true,
  });
  const before = (await trigger.boundingBox())!;
  await page.mouse.move(
    before.x + before.width / 2,
    before.y + before.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    before.x + before.width / 2 - 160,
    before.y + before.height / 2 + 80,
    { steps: 10 },
  );
  await page.mouse.up();
  await expect(
    page.getByRole('dialog', { name: 'ViewModel Devtools', exact: true }),
  ).toHaveCount(0);
  const after = (await trigger.boundingBox())!;
  expect(after.x).toBeLessThan(before.x - 150);
  expect(after.y).toBeGreaterThan(before.y + 70);
  await expect(page).toHaveScreenshot('devtools-glass-trigger.png');
  await page.keyboard.press('Control+F12');
  await expect(
    page.getByRole('dialog', { name: 'ViewModel Devtools', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Close devtools', exact: true })
    .click();
  await expect(trigger).toBeVisible();
});

test('keeps popup layout on reopening and fits a small viewport', async ({
  page,
}) => {
  const popup = page.getByRole('dialog', {
    name: 'ViewModel Devtools',
    exact: true,
  });
  const before = (await popup.boundingBox())!;
  const handle = (await page
    .locator('[data-resize-handle="left"]')
    .boundingBox())!;
  await page.mouse.move(handle.x + 2, handle.y + handle.height / 2);
  await page.mouse.down();
  await page.mouse.move(handle.x + 122, handle.y + handle.height / 2, {
    steps: 10,
  });
  await page.mouse.up();
  const resized = (await popup.boundingBox())!;
  expect(resized.width).toBeLessThan(before.width - 110);
  expect(Math.round(resized.x + resized.width)).toBe(
    Math.round(before.x + before.width),
  );
  await page
    .getByRole('button', { name: 'Close devtools', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Toggle ViewModel Devtools', exact: true })
    .click();
  expect(Math.round((await popup.boundingBox())!.width)).toBe(
    Math.round(resized.width),
  );
  await page.setViewportSize({ width: 360, height: 320 });
  await expect
    .poll(async () => {
      const rect = (await popup.boundingBox())!;
      return (
        rect.x >= 0 &&
        rect.y >= 0 &&
        rect.x + rect.width <= 360 &&
        rect.y + rect.height <= 320
      );
    })
    .toBe(true);
});

test('disposes the application and can create a fresh one without duplicate keyboard listeners', async ({
  page,
}) => {
  await page.evaluate(() => (globalThis as any).fixture.devtools.destroy());
  await expect(page.locator('#view-model-devtools')).toHaveCount(0);
  await page.evaluate(() => (globalThis as any).fixture.recreate());
  const trigger = page.getByRole('button', {
    name: 'Toggle ViewModel Devtools',
    exact: true,
  });
  await expect(trigger).toBeVisible();
  await page.keyboard.press('Control+F12');
  await expect(
    page.getByRole('dialog', { name: 'ViewModel Devtools', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Close devtools', exact: true })
    .click();
  await expect(trigger).toBeVisible();
});

test('completes nested search with the keyboard', async ({ page }) => {
  const search = page.getByRole('textbox', {
    name: 'Search ViewModels and properties',
  });
  await search.fill('preferences.th');
  await expect(
    page.getByRole('listbox', { name: 'Search suggestions' }),
  ).toBeVisible();
  await search.press('Tab');
  await expect(search).toHaveValue('preferences.theme');
  await expect(page.getByText('"dark"', { exact: true })).toBeVisible();
});

test('releases search focus and keyboard handling when closed', async ({
  page,
}) => {
  await page.evaluate(() =>
    document.body.insertAdjacentHTML(
      'afterbegin',
      '<input aria-label="Host search">',
    ),
  );
  await page
    .getByRole('button', { name: 'Close devtools', exact: true })
    .click();
  await page.getByRole('textbox', { name: 'Host search', exact: true }).focus();
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('button', {
      name: 'Toggle ViewModel Devtools',
      exact: true,
    }),
  ).toBeFocused();
});

test.afterEach(async ({ page }) => {
  expect(pageErrors.get(page)).toEqual([]);
});

test('groups VM base properties and excludes them from search', async ({
  page,
}) => {
  await page.goto('/compatibility.html?entry=module');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const settings = page.getByRole('dialog', { name: 'Settings', exact: true });
  await expect(
    settings.getByRole('checkbox', { name: 'Group VM properties' }),
  ).toBeChecked();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const group = page.getByRole('button', { name: 'vm properties' });
  await expect(group).toBeVisible();
  await expect(group).toHaveAttribute('aria-expanded', 'false');
  await expect(group.locator('i')).toHaveText('vm properties');
  await expect(page.getByText('payload', { exact: true })).toHaveCount(0);
  await expect(page.getByText('legacyLabel', { exact: true })).toBeVisible();
  await group.click();
  await expect(group).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByText('payload', { exact: true })).toBeVisible();
  const groupRow = page.locator('[data-depth]').filter({ has: group });
  const rowBounds = (await groupRow.boundingBox())!;
  await groupRow.click({
    position: { x: rowBounds.width - 8, y: rowBounds.height / 2 },
  });
  await expect(group).toHaveAttribute('aria-expanded', 'false');
  await group.focus();
  await group.press('Enter');
  await expect(group).toHaveAttribute('aria-expanded', 'true');
  await group.press('Space');
  await expect(group).toHaveAttribute('aria-expanded', 'false');
  await group.click();
  await expect(group).toHaveAttribute('aria-expanded', 'true');
  const search = page.getByPlaceholder(
    'search by property path or ViewModel name',
  );
  await search.fill('payload');
  await expect(group).toHaveCount(0);
  await expect(page.getByText('payload', { exact: true })).toHaveCount(0);
  await search.fill('legacyLabel');
  await expect(
    page.getByText('legacyLabel', { exact: true }).first(),
  ).toBeVisible();
  await search.fill('');
  await expect(group).toBeVisible();
  await expect(group).toHaveAttribute('aria-expanded', 'true');
  await expect
    .poll(() =>
      page.evaluate(() =>
        localStorage.getItem(
          'mobx-view-model-devtools/groupViewModelBaseMembers',
        ),
      ),
    )
    .toBe('true');
  expect(pageErrors.get(page)).toEqual([]);
});
