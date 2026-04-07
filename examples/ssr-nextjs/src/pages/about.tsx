import Head from 'next/head';
import type { NextPage } from 'next';
import {
  withRootStoreProps,
  type WithRootStorePageProps,
} from '@/stores/root-store/lib/with-root-store-props';

type AboutProps = WithRootStorePageProps<{ renderedAt: string }>;

export const getServerSideProps = withRootStoreProps(async () => {
  await new Promise((r) => setTimeout(r, 25));
  return {
    props: {
      renderedAt: new Date().toISOString(),
    },
  };
});

const AboutPage: NextPage<AboutProps> = ({ renderedAt }) => (
  <>
    <Head>
      <title>About · mobx-view-model SSR</title>
    </Head>
    <main className="mx-auto max-w-[40rem] px-5 pb-16 pt-8">
      <h1 className="mb-4 text-2xl font-semibold">About this example</h1>
      <p className="text-sm text-demo-muted">
        This route lives under <code className="text-demo-fg">src/pages</code>{' '}
        (Pages Router, <code className="text-demo-fg">getServerSideProps</code>
        ) with no ViewModel. Home, Widgets, and Timeline use the demo card UI;
        Widgets and Timeline hydrate a MobX ViewModel with different store ids.
      </p>
      <section className="mt-8 rounded-xl border border-demo-border bg-demo-card px-6 py-5">
        <h2 className="mb-2 text-lg font-semibold">Rendered on the server</h2>
        <p className="m-0 text-sm text-demo-muted">Request time: {renderedAt}</p>
      </section>
    </main>
  </>
);

export default AboutPage;
