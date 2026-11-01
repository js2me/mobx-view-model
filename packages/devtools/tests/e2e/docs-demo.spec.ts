import { expect, test } from '@playwright/test';

test('scrolls the docs inspector with the wheel and scrollbar thumb', async ({
  page,
}) => {
  await page.goto('/docs-demo.html');
  await page
    .getByRole('button', { name: 'Toggle ViewModel Devtools', exact: true })
    .click();
  const dialog = page.getByRole('dialog', {
    name: 'ViewModel Devtools',
    exact: true,
  });
  const viewport = dialog.locator('.simplebar-content-wrapper');
  const thumb = dialog.locator('.simplebar-vertical .simplebar-scrollbar');
  await expect(thumb).toBeVisible();
  await dialog.hover();
  await page.mouse.wheel(0, 500);
  await expect
    .poll(() => viewport.evaluate((el) => el.scrollTop))
    .toBeGreaterThan(0);
  const { scrollBeforeDrag, remainingScroll } = await viewport.evaluate(
    (el) => ({
      scrollBeforeDrag: el.scrollTop,
      remainingScroll: el.scrollHeight - el.clientHeight - el.scrollTop,
    }),
  );
  expect(remainingScroll).toBeGreaterThan(0);
  const thumbBox = (await thumb.boundingBox())!;
  const x = thumbBox.x + thumbBox.width / 2;
  const y = thumbBox.y + thumbBox.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y + 160, { steps: 12 });
  await page.mouse.up();
  await expect
    .poll(() => viewport.evaluate((el) => el.scrollTop))
    .toBeGreaterThan(scrollBeforeDrag + Math.min(500, remainingScroll / 2));
  await expect(dialog.getByText('13 live', { exact: true })).toBeVisible();
});

test.describe('mobile docs inspector', () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });

  test('scrolls with a touch swipe', async ({ page }) => {
    await page.goto('/docs-demo.html');
    await page
      .getByRole('button', { name: 'Toggle ViewModel Devtools', exact: true })
      .tap();
    const viewport = page.locator('.simplebar-content-wrapper');
    await expect(viewport).toBeVisible();
    const box = (await viewport.boundingBox())!;
    const x = box.x + box.width / 2;
    const y = box.y + box.height * 0.8;
    const session = await page.context().newCDPSession(page);
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x, y }],
    });
    for (let step = 1; step <= 10; step++) {
      await session.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x, y: y - step * 30 }],
      });
    }
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [],
    });
    await expect
      .poll(() => viewport.evaluate((el) => el.scrollTop))
      .toBeGreaterThan(100);
    await session.detach();
  });
});

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
