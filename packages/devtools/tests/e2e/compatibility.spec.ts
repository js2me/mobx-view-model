import { expect, test } from '@playwright/test';

for (const core of ['8.0', '8', '9', '10', '11']) {
  for (const order of ['host-first', 'devtools-first']) {
    for (const popup of ['opened', 'persisted-open']) {
      test(`${core === '8.0' ? 'explicitly connects' : 'auto-connects'} core ${core} (${order}, ${popup}) and tracks store changes`, async ({
        page,
      }) => {
        const errors: string[] = [];
        page.on('pageerror', (error) => errors.push(error.message));
        await page.goto(
          `/compatibility.html?core=${core}&order=${order}&popup=${popup}`,
        );
        await expect(
          page.getByText('CompatibilityVM', { exact: true }),
        ).toBeVisible();

        const search = page.getByRole('textbox', {
          name: 'Search ViewModels and properties',
        });
        await search.fill('no-matching-model-481516');
        await expect(
          page.getByText('No matching ViewModels or properties', {
            exact: true,
          }),
        ).toBeVisible();
        await search.fill('');
        await expect(
          page.getByText('CompatibilityVM', { exact: true }),
        ).toBeVisible();

        await page.evaluate(() => (globalThis as any).compatibility.add());
        await expect(page.getByText('AddedVM', { exact: true })).toBeVisible();

        await page.evaluate(() => (globalThis as any).compatibility.replace());
        await expect(
          page.getByText('ReplacementVM', { exact: true }),
        ).toBeVisible();
        await expect(page.getByText('AddedVM', { exact: true })).toHaveCount(0);

        await page.evaluate(() => (globalThis as any).compatibility.remove());
        await expect(
          page.getByText('ReplacementVM', { exact: true }),
        ).toHaveCount(0);

        await page.evaluate(async () => {
          const devtools = (globalThis as any).ViewModelDevtools.define();
          devtools.hidePopup();
          await (globalThis as any).compatibility.add();
          devtools.showPopup();
        });
        await expect(page.getByText('AddedVM', { exact: true })).toBeVisible();

        await page.evaluate(() => (globalThis as any).compatibility.newStore());
        await expect(
          page.getByText('NewStoreVM', { exact: true }),
        ).toBeVisible();
        await expect(
          page.getByText('CompatibilityVM', { exact: true }),
        ).toHaveCount(0);
        expect(errors).toEqual([]);
      });
    }
  }
}

for (const core of ['8.0', '8']) {
  for (const order of ['host-first', 'devtools-first']) {
    test(`explicitly connects the module entry to core ${core} (${order}) with isolated MobX`, async ({
      page,
    }) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto(
        `/compatibility.html?core=${core}&entry=module&order=${order}`,
      );
      await expect(
        page.getByText('CompatibilityVM', { exact: true }),
      ).toBeVisible();
      const label = page
        .locator('[data-depth]')
        .filter({ has: page.getByText('legacyLabel', { exact: true }) });
      await label.hover();
      await label.getByTitle('Edit', { exact: true }).click();
      await label.getByRole('textbox').fill('"updated"');
      await label.getByRole('textbox').press('Enter');
      await expect(label.getByText('"updated"', { exact: true })).toBeVisible();
      await page.evaluate(() => (globalThis as any).compatibility.add());
      await expect(page.getByText('AddedVM', { exact: true })).toBeVisible();
      await page.evaluate(() => (globalThis as any).compatibility.replace());
      await expect(
        page.getByText('ReplacementVM', { exact: true }),
      ).toBeVisible();
      await page.evaluate(() => (globalThis as any).compatibility.remove());
      await expect(
        page.getByText('ReplacementVM', { exact: true }),
      ).toHaveCount(0);
      const search = page.getByRole('textbox', {
        name: 'Search ViewModels and properties',
      });
      await search.fill('no-matching-model-481516');
      await expect(
        page.getByText('No matching ViewModels or properties', { exact: true }),
      ).toBeVisible();
      await search.fill('');
      await page.evaluate(() => (globalThis as any).compatibility.newStore());
      await expect(page.getByText('NewStoreVM', { exact: true })).toBeVisible();
      expect(errors).toEqual([]);
    });
  }
}
