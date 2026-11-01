import { expect, type Locator, type Page, test } from '@playwright/test';

const runtimeErrors = new WeakMap<Page, string[]>();

test.afterEach(async ({ page }) => {
  expect(runtimeErrors.get(page)).toEqual([]);
});

const propertyRow = (dialog: Locator, name: string) =>
  dialog.locator('[data-depth]').filter({
    has: dialog.page().getByText(name, { exact: true }),
  });

for (const entry of ['module', 'standalone']) {
  for (const order of ['host-first', 'devtools-first']) {
    test.describe(`Solid (${entry}, ${order})`, () => {
      test.beforeEach(async ({ page }) => {
        const errors: string[] = [];
        runtimeErrors.set(page, errors);
        page.on('pageerror', (error) => errors.push(error.message));
        page.on('console', (message) => {
          if (message.type() === 'error') errors.push(message.text());
        });
        await page.goto(`/solid.html?entry=${entry}&order=${order}`);
        await expect(page.locator('body')).toHaveAttribute(
          'data-ready',
          'true',
        );
        await expect(
          page.getByRole('status', { name: 'Count', exact: true }),
        ).toHaveText('2');
        await page
          .getByRole('button', {
            name: 'Toggle ViewModel Devtools',
            exact: true,
          })
          .click();
        await expect(
          page.getByRole('dialog', { name: 'ViewModel Devtools', exact: true }),
        ).toBeVisible();
      });

      test('inspects the Solid hierarchy and synchronizes observable and computed state in both directions', async ({
        page,
      }) => {
        const dialog = page.getByRole('dialog', {
          name: 'ViewModel Devtools',
          exact: true,
        });
        await expect(dialog.getByText('2 live', { exact: true })).toBeVisible();
        const parent = propertyRow(dialog, 'SolidAppVM').filter({
          has: page.getByText('solid-app', { exact: true }),
        });
        const child = propertyRow(dialog, 'SolidCounterVM').filter({
          has: page.getByText('solid-counter', { exact: true }),
        });
        await expect(parent).toBeVisible();
        await expect(child).toBeVisible();
        const parentDepth = await parent.getAttribute('data-depth');
        await expect(child).toHaveAttribute('data-depth', `${parentDepth}-`);

        const search = dialog.getByRole('textbox', {
          name: 'Search ViewModels and properties',
        });
        await search.fill('solid-counter');
        const count = propertyRow(dialog, 'count');
        const doubled = propertyRow(dialog, 'doubled');
        await expect(count.getByText('2', { exact: true })).toBeVisible();
        await expect(doubled.getByText('4', { exact: true })).toBeVisible();

        await page
          .getByRole('button', { name: 'Increment', exact: true })
          .click();
        await expect(
          page.getByRole('status', { name: 'Count', exact: true }),
        ).toHaveText('3');
        await expect(count.getByText('3', { exact: true })).toBeVisible();
        await expect(doubled.getByText('6', { exact: true })).toBeVisible();

        await count.hover();
        await count.getByTitle('Edit', { exact: true }).click();
        await count.getByRole('textbox').fill('21');
        await count.getByRole('textbox').press('Enter');
        await expect(count.getByText('21', { exact: true })).toBeVisible();
        await expect(doubled.getByText('42', { exact: true })).toBeVisible();
        await expect(
          page.getByRole('status', { name: 'Count', exact: true }),
        ).toHaveText('21');
        await expect(
          page.getByRole('status', { name: 'Doubled', exact: true }),
        ).toHaveText('42');
      });

      test('tracks Solid cleanup, remount and changes while the popup is closed', async ({
        page,
      }) => {
        const dialog = page.getByRole('dialog', {
          name: 'ViewModel Devtools',
          exact: true,
        });
        const toggle = page.getByRole('button', {
          name: 'Toggle counter',
          exact: true,
        });
        await expect(
          dialog.getByText('SolidCounterVM', { exact: true }),
        ).toBeVisible();
        await toggle.click();
        await expect(
          page.getByRole('region', { name: 'Solid counter' }),
        ).toHaveCount(0);
        await expect(
          dialog.getByText('SolidCounterVM', { exact: true }),
        ).toHaveCount(0);
        await expect(dialog.getByText('1 live', { exact: true })).toBeVisible();

        const trigger = page.getByRole('button', {
          name: 'Toggle ViewModel Devtools',
          exact: true,
        });
        await dialog
          .getByRole('button', { name: 'Close devtools', exact: true })
          .click();
        await expect(dialog).toBeHidden();
        await toggle.click();
        await page
          .getByRole('button', { name: 'Increment', exact: true })
          .click();
        await trigger.click();
        await expect(dialog.getByText('2 live', { exact: true })).toBeVisible();
        await expect(
          dialog.getByText('SolidCounterVM', { exact: true }),
        ).toHaveCount(1);
        await dialog
          .getByRole('textbox', { name: 'Search ViewModels and properties' })
          .fill('solid-counter');
        await expect(
          propertyRow(dialog, 'count').getByText('3', { exact: true }),
        ).toBeVisible();

        await page
          .getByRole('button', { name: 'Unmount Solid app', exact: true })
          .click();
        await dialog
          .getByRole('textbox', { name: 'Search ViewModels and properties' })
          .fill('');
        await expect(
          dialog.getByText('SolidCounterVM', { exact: true }),
        ).toHaveCount(0);
        await expect(
          dialog.getByText('SolidAppVM', { exact: true }),
        ).toHaveCount(0);
        await expect(dialog.getByText('0 live', { exact: true })).toBeVisible();
      });
    });
  }
}
