import { expect, test } from '@playwright/test';

test('recreates connected sessions on args and story changes without React warnings', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    // Storybook 10's manager emits this upstream deprecation when changing stories.
    if (message.text().startsWith("The 'ariaLabel' prop on 'PopoverProvider'"))
      return;
    if (message.type() === 'error' || message.type() === 'warning')
      errors.push(message.text());
  });
  await page.addInitScript(() => {
    const intervals = new Set<number>();
    Object.assign(globalThis, { demoIntervals: intervals });
    const schedule = window.setInterval.bind(window);
    const clear = window.clearInterval.bind(window);
    window.setInterval = ((handler, timeout, ...args) => {
      const id = schedule(handler, timeout, ...args);
      if (timeout === 500) intervals.add(id);
      return id;
    }) as typeof window.setInterval;
    window.clearInterval = (id) => {
      if (id !== undefined) intervals.delete(id);
      clear(id);
    };
  });
  await page.goto('/?path=/story/devtools-connected-store--ten-thousand');
  const frame = page.frameLocator('#storybook-preview-iframe');
  await expect(
    frame.getByRole('dialog', { name: 'ViewModel Devtools', exact: true }),
  ).toBeVisible();
  await page.locator('#control-count').fill('1000');
  await page.locator('#control-count').press('Tab');
  await expect(frame.locator('main')).toContainText('1,000 ViewModels');
  await expect(frame.locator('#view-model-devtools')).toHaveCount(1);
  await frame
    .getByRole('button', { name: 'Add ViewModel', exact: true })
    .click();
  await expect(frame.locator('main')).toContainText('1,001 ViewModels');
  await frame
    .getByRole('button', { name: 'Remove ViewModel', exact: true })
    .click();
  await expect(frame.locator('main')).toContainText('1,000 ViewModels');
  await frame
    .getByRole('button', { name: 'Find last ViewModel', exact: true })
    .click();
  await expect(frame.getByText('project-00999', { exact: true })).toBeVisible();
  await page
    .getByRole('link', { name: 'Light Background', exact: true })
    .click();
  await expect(frame.locator('#view-model-devtools')).toHaveAttribute(
    'data-vmd-theme',
    'light',
  );
  await page.getByRole('link', { name: 'Fully Expanded', exact: true }).click();
  await expect(frame.locator('main')).toContainText('10,000 ViewModels');
  await expect(
    frame
      .locator('[data-depth]')
      .filter({ has: frame.getByText('requests', { exact: true }) })
      .first(),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Live Updates', exact: true }).click();
  await expect(frame.locator('main')).toContainText('1,000 ViewModels');
  await expect
    .poll(() =>
      frame
        .locator('body')
        .evaluate(() => (globalThis as any).demoIntervals.size),
    )
    .toBe(1);
  await page.getByRole('link', { name: 'Default', exact: true }).click();
  await expect(frame.locator('main')).toContainText('100 ViewModels');
  await expect(frame.locator('#view-model-devtools')).toHaveCount(1);
  await expect
    .poll(() =>
      frame
        .locator('body')
        .evaluate(() => (globalThis as any).demoIntervals.size),
    )
    .toBe(0);
  expect(errors).toEqual([]);
});
