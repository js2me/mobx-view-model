import { expect, test } from '@playwright/test';

for (const core of ['9', '10', '11']) {
  for (const order of ['host-first', 'devtools-first']) {
    for (const popup of ['opened', 'persisted-open']) {
      test(`auto-connects core ${core} (${order}, ${popup}) and tracks store changes`, async ({
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
