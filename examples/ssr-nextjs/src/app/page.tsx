import { DemoPageClient } from '@/components/demo-page-client';
import { DemoPagePayload } from '@/components/demo-page-client/model';

/** Fresh `serverRenderedAt` on every request (SSR). */
export const dynamic = 'force-dynamic';

/** Simulates async work in a Server Component (DB, API, …). */
async function loadInitialPayload(): Promise<DemoPagePayload> {
  await new Promise((r) => setTimeout(r, 40));
  return {
    headline: 'This text came from the Server Component',
    serverRenderedAt: new Date().toISOString(),
  };
}

export default async function HomePage() {
  const initialPayload = await loadInitialPayload();

  return (
    <main>
      <h1>SSR + mobx-view-model + hydration</h1>
      <p className="muted">
        View page source: HTML may show the fallback or full content depending on
        timing; after hydration the ViewModel attaches to the store as in the
        docs. The button below only exercises MobX in the browser.
      </p>
      <DemoPageClient initialPayload={initialPayload} />
    </main>
  );
}
