import type { DemoPagePayload } from './components/demo-page-client/model.js';
import { DemoPageClient } from './components/demo-page-client/index.js';
import { TimelineDemoClient } from './components/pages/timeline-demo-client.js';
import { WidgetsDemoClient } from './components/pages/widgets-demo-client.js';
import { loadDemoPayload } from './shared/api/load-demo-payload.js';
import {
  withRootStoreProps,
  type WithRootStorePageProps,
} from './stores/root-store/lib/with-root-store-props.js';

export type AppRouteData =
  | {
      pathname: '/';
      pageTitle: string;
      data: WithRootStorePageProps<{ initialPayload: DemoPagePayload }>;
    }
  | {
      pathname: '/about';
      pageTitle: string;
      data: WithRootStorePageProps<{ renderedAt: string }>;
    }
  | {
      pathname: '/widgets';
      pageTitle: string;
      data: WithRootStorePageProps<{ initialPayload: DemoPagePayload }>;
    }
  | {
      pathname: '/timeline';
      pageTitle: string;
      data: WithRootStorePageProps<{ initialPayload: DemoPagePayload }>;
    };

export async function getRouteData(pathname: string): Promise<AppRouteData | null> {
  if (pathname === '/') {
    const getServerSideProps = withRootStoreProps(async () => ({
      props: { initialPayload: await loadDemoPayload() },
    }));
    return {
      pathname: '/',
      pageTitle: 'mobx-view-model · SSR + Express',
      data: (await getServerSideProps()).props,
    };
  }

  if (pathname === '/about') {
    const getServerSideProps = withRootStoreProps(async () => {
      await new Promise((r) => setTimeout(r, 25));
      return { props: { renderedAt: new Date().toISOString() } };
    });
    return {
      pathname: '/about',
      pageTitle: 'About · mobx-view-model SSR',
      data: (await getServerSideProps()).props,
    };
  }

  if (pathname === '/widgets') {
    const getServerSideProps = withRootStoreProps(async () => ({
      props: {
        initialPayload: await loadDemoPayload({
          pageTitle: 'Widgets',
          headline: 'SSR payload for the Widgets route — separate ViewModel id',
        }),
      },
    }));
    return {
      pathname: '/widgets',
      pageTitle: 'Widgets · mobx-view-model SSR',
      data: (await getServerSideProps()).props,
    };
  }

  if (pathname === '/timeline') {
    const getServerSideProps = withRootStoreProps(async () => ({
      props: {
        initialPayload: await loadDemoPayload({
          pageTitle: 'Timeline',
          headline: 'Another server headline — MobX state is scoped to this page',
          bumpable: false,
        }),
      },
    }));
    return {
      pathname: '/timeline',
      pageTitle: 'Timeline · mobx-view-model SSR',
      data: (await getServerSideProps()).props,
    };
  }

  return null;
}

export function RouteView({ route }: { route: AppRouteData }) {
  if (route.pathname === '/') {
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
        <DemoPageClient payload={route.data.initialPayload} />
      </main>
    );
  }

  if (route.pathname === '/about') {
    return (
      <main className="mx-auto max-w-[40rem] px-5 pb-16 pt-8">
        <h1 className="mb-4 text-2xl font-semibold">About this example</h1>
        <p className="text-sm text-demo-muted">
          This example mirrors the Next.js demo but renders via plain Express +
          React server rendering.
        </p>
        <section className="mt-8 rounded-xl border border-demo-border bg-demo-card px-6 py-5">
          <h2 className="mb-2 text-lg font-semibold">Rendered on the server</h2>
          <p className="m-0 text-sm text-demo-muted">
            Request time: {route.data.renderedAt}
          </p>
        </section>
      </main>
    );
  }

  if (route.pathname === '/widgets') {
    return (
      <main className="mx-auto max-w-[40rem] px-5 pb-16 pt-8">
        <p className="mb-6 text-sm text-demo-muted">
          Counters here are independent from Home and Timeline because this
          screen uses <code className="text-demo-fg">demo-widgets-vm</code> in
          the store.
        </p>
        <WidgetsDemoClient payload={route.data.initialPayload} />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[40rem] px-5 pb-16 pt-8">
      <p className="mb-6 text-sm text-demo-muted">
        The button is disabled (<code className="text-demo-fg">bumpable: false</code>)
        {' '}to show payload-driven UI; VM id is{' '}
        <code className="text-demo-fg">demo-timeline-vm</code>.
      </p>
      <TimelineDemoClient payload={route.data.initialPayload} />
    </main>
  );
}
