import { chromium } from '@playwright/test';

// Run the production build and the e2e fixture server before invoking this script.
const baseURL = process.env.DEVTOOLS_FIXTURE_URL ?? 'http://127.0.0.1:4178';
const repetitions = Number(process.env.PERF_REPETITIONS ?? 3);
const scenarios = [
  ['100/default', 'count=100'],
  ['1000/collapsed', 'count=1000'],
  ['10000/collapsed', 'count=10000'],
  ['10000/flat', 'count=10000&children=0'],
  ['10000/expanded', 'count=10000&expanded=1'],
];
const samples = [];
const browser = await chromium.launch();
try {
  for (const [scenario, query] of scenarios) {
    for (let iteration = 0; iteration < repetitions; iteration++) {
      const page = await browser.newPage({
        viewport: { width: 1280, height: 900 },
      });
      try {
        await page.goto(`${baseURL}/large-store.html?${query}`);
        await page
          .locator('#ready')
          .getByText('ViewModels ready', { exact: false })
          .waitFor();
        for (const opening of ['cold', 'warm']) {
          if (opening === 'warm') {
            await page.evaluate(() =>
              globalThis.largeStore.devtools.hidePopup(),
            );
            await page
              .getByRole('dialog', { name: 'ViewModel Devtools', exact: true })
              .waitFor({ state: 'hidden' });
          }
          await page
            .getByRole('button', { name: 'Open devtools', exact: true })
            .click();
          await page
            .getByRole('dialog', { name: 'ViewModel Devtools', exact: true })
            .waitFor();
          const metrics = await page.evaluate(async () => {
            await new Promise((resolve) =>
              requestAnimationFrame(() => requestAnimationFrame(resolve)),
            );
            const fixture = globalThis.largeStore;
            return {
              openMs: Math.round(performance.now() - fixture.openedAt),
              cachedItems: fixture.devtools.inspector.items.size,
              domRows: document.querySelectorAll(
                '#view-model-devtools [data-depth]',
              ).length,
              computedReads: fixture.diagnostics.computedReads,
            };
          });
          samples.push({ scenario, iteration, opening, ...metrics });
        }
      } finally {
        await page.close();
      }
    }
  }
} finally {
  await browser.close();
}
const medians = scenarios.flatMap(([scenario]) =>
  ['cold', 'warm'].map((opening) => {
    const group = samples.filter(
      (sample) => sample.scenario === scenario && sample.opening === opening,
    );
    const times = group.map((sample) => sample.openMs).sort((a, b) => a - b);
    return {
      scenario,
      opening,
      medianMs: times[Math.floor(times.length / 2)],
      maxCachedItems: Math.max(...group.map((sample) => sample.cachedItems)),
      maxDomRows: Math.max(...group.map((sample) => sample.domRows)),
    };
  }),
);
console.log(
  JSON.stringify(
    { repetitions, viewport: '1280x900', samples, medians },
    null,
    2,
  ),
);
