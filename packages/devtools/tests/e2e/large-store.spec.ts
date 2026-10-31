import { expect, test } from '@playwright/test';

for (const query of [
  'count=10000',
  'count=10000&children=0',
  'count=10000&expanded=1',
  'count=10000&mode=list',
]) {
  test(`virtualizes a real connected store: ${query}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`/large-store.html?${query}`);
    await expect(
      page.getByText('10000 ViewModels ready', { exact: true }),
    ).toBeVisible();
    await page
      .getByRole('button', { name: 'Open devtools', exact: true })
      .click();
    const dialog = page.getByRole('dialog', {
      name: 'ViewModel Devtools',
      exact: true,
    });
    await expect(dialog).toBeVisible();
    await expect
      .poll(() => page.locator('#view-model-devtools [data-depth]').count())
      .toBeGreaterThan(10);
    expect(
      await page.locator('#view-model-devtools [data-depth]').count(),
    ).toBeLessThan(80);
    const cached = await page.evaluate(
      () => (globalThis as any).largeStore.devtools.inspector.items.size,
    );
    expect(cached).toBeLessThan(500);
    await page.evaluate(() => {
      const fixture = (globalThis as any).largeStore;
      fixture.devtools.hidePopup();
    });
    await expect(dialog).not.toBeVisible();
    await page
      .getByRole('button', { name: 'Open devtools', exact: true })
      .click();
    await expect(dialog).toBeVisible();
    expect(
      await page.evaluate(
        () => (globalThis as any).largeStore.devtools.inspector.items.size,
      ),
    ).toBe(cached);
    await page
      .getByRole('textbox', { name: 'Search ViewModels and properties' })
      .fill('project-09999');
    await expect(
      page.getByText('project-09999', { exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => (globalThis as any).largeStore.devtools.inspector.items.size,
      ),
    ).toBeLessThan(500);
    expect(errors).toEqual([]);
  });
}

test('updates and removes inspected VM data without retaining old watchers', async ({
  page,
}) => {
  await page.goto('/large-store.html?count=1000');
  await page
    .getByRole('button', { name: 'Open devtools', exact: true })
    .click();
  await page
    .getByRole('textbox', { name: 'Search ViewModels and properties' })
    .fill('project-00999');
  await expect(page.getByText('project-00999', { exact: true })).toBeVisible();
  const row = page
    .locator('[data-depth]')
    .filter({ has: page.getByText('requests', { exact: true }) });
  await row.hover();
  await row.getByTitle('Watch property changes', { exact: true }).click();
  await expect(
    page.getByText('watch history (1)', { exact: true }),
  ).toBeVisible();
  await page.evaluate(() =>
    (globalThis as any).largeStore.instances[999].increment(),
  );
  await expect(
    page.getByText('watch history (2)', { exact: true }),
  ).toBeVisible();
  await page.evaluate(() => {
    const f = (globalThis as any).largeStore;
    f.store.unmount(f.instances[999]);
    f.devtools.notifyVmChange();
  });
  await expect(page.getByText('project-00999', { exact: true })).toHaveCount(0);
  expect(
    await page.evaluate(
      () => (globalThis as any).largeStore.devtools.inspector.items.size,
    ),
  ).toBeLessThan(30);
});
