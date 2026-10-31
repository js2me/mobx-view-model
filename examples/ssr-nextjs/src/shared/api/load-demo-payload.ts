import type { DemoPagePayload } from '@/components/demo-page-client/model';

/** Simulates async work in a Server Component (DB, API, …). */
export async function loadDemoPayload(
  overrides: Partial<DemoPagePayload> = {},
): Promise<DemoPagePayload> {
  await new Promise((r) => setTimeout(r, 40));
  return {
    headline: 'This text came from the Server Component',
    serverRenderedAt: new Date().toISOString(),
    bumpable: true,
    ...overrides,
  };
}
