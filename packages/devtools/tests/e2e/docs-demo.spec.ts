import { expect, test } from '@playwright/test';

test('loads the actual docs demo with core 11, real VM hierarchy and editable state', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto('/docs-demo.html');
  await expect(
    page.getByText('Docs demo ready', { exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Toggle ViewModel Devtools', exact: true })
    .click();
  const dialog = page.getByRole('dialog', {
    name: 'ViewModel Devtools',
    exact: true,
  });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('13 live', { exact: true })).toBeVisible();
  await page
    .getByRole('textbox', { name: 'Search ViewModels and properties' })
    .fill('docs-demo-nav-breadcrumb');
  await expect(
    page.getByText('docs-demo-nav-breadcrumb', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('DocsDemoNavBreadcrumbVM', { exact: true }),
  ).toBeVisible();
  await page
    .getByRole('textbox', { name: 'Search ViewModels and properties' })
    .fill('docs-demo-counter');
  const count = page
    .locator('[data-depth]')
    .filter({ has: page.getByText('count', { exact: true }) });
  await expect(count.getByText('42', { exact: true })).toBeVisible();
  await count.hover();
  await count.getByTitle('Edit', { exact: true }).click();
  await count.getByRole('textbox').fill('43');
  await count.getByRole('textbox').press('Enter');
  await expect(count.getByText('43', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
