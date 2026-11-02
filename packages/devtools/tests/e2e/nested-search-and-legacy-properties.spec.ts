import { expect, test } from '@playwright/test';

test('product. offers nonempty nested hints and follows a selected property', async ({
  page,
}) => {
  await page.goto('/');
  await page.evaluate(() => {
    (globalThis as any).fixture.devtools.setExtras({
      product: {
        displayName: 'Load Testing',
        data: { product: { id: 10082 } },
        permissions: { canEdit: true },
      },
    });
  });
  const input = page.getByRole('textbox', {
    name: 'Search ViewModels and properties',
  });
  await input.fill('product.');
  const listbox = page.getByRole('listbox', { name: 'Search suggestions' });
  await expect(
    listbox.getByRole('option', { name: 'displayName', exact: true }),
  ).toBeVisible();
  await expect(
    listbox.getByRole('option', { name: 'permissions', exact: true }),
  ).toBeVisible();
  expect(
    (await listbox.getByRole('option').allTextContents()).every(
      (text) => text.trim().length > 0,
    ),
  ).toBe(true);
  await listbox.getByRole('option', { name: 'data', exact: true }).click();
  await expect(input).toHaveValue('product.data');
  await input.press('End');
  await input.press('.');
  await expect(
    listbox.getByRole('option', { name: 'product', exact: true }),
  ).toBeVisible();
});

for (const core of ['8.0', '8', '9', '10', '11']) {
  test(`core ${core} internals stay inside the collapsed vm properties group`, async ({
    page,
  }) => {
    await page.goto(
      `/compatibility.html?core=${core}&order=host-first&popup=opened`,
    );
    await expect(page.getByText('legacyLabel', { exact: true })).toBeVisible();
    const representative = core === '11' ? 'vm' : 'vmParams';
    const group = page.getByText('vm properties', { exact: true });
    await expect(page.getByText(representative, { exact: true })).toHaveCount(
      0,
    );
    await expect(group).toBeVisible();
    for (const key of [
      'vmParams',
      'vmConfig',
      'isPayloadEqual',
      '_isMounted',
      '_payload',
      'isUnmounting',
      'beginUnmounting',
      'finalizeUnmount',
      'payloadChanged',
      'getParentViewModel',
    ]) {
      await expect(page.getByText(key, { exact: true })).toHaveCount(0);
    }
    await group.click();
    await expect(page.getByText(representative, { exact: true })).toBeVisible();
    await group.click();
    await expect(page.getByText(representative, { exact: true })).toHaveCount(
      0,
    );
    await expect(page.getByText('legacyLabel', { exact: true })).toBeVisible();
  });
}
