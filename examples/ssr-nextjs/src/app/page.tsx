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
    bumpable: true,
  };
}

export default async function HomePage() {
  const initialPayload = await loadInitialPayload();

  return (
    <main className="mx-auto max-w-[40rem] px-5 pb-16 pt-8">
      <h1 className="mb-4 text-2xl font-semibold">
        SSR + mobx-view-model + hydration
      </h1>
      <p className="text-sm text-demo-muted">
        View page source: the card HTML comes from the same markup as after
        attach/mount; the button is disabled until the ViewModel is live. After
        hydration, MobX on the VM handles clicks.
      </p>
      <DemoPageClient payload={initialPayload} />
    </main>
  );
}
