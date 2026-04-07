import Head from 'next/head';
import type { NextPage } from 'next';
import type { DemoPagePayload } from '@/components/demo-page-client/model';
import { DemoPageClient } from '@/components/demo-page-client';
import { loadDemoPayload } from '@/shared/api/load-demo-payload';
import {
  withRootStoreProps,
  type WithRootStorePageProps,
} from '@/stores/root-store/lib/with-root-store-props';

type HomeProps = WithRootStorePageProps<{ initialPayload: DemoPagePayload }>;

export const getServerSideProps = withRootStoreProps(async () => {
  const initialPayload = await loadDemoPayload();
  return { props: { initialPayload } };
});

const HomePage: NextPage<HomeProps> = ({ initialPayload }) => (
  <>
    <Head>
      <title>mobx-view-model · SSR + Next.js</title>
      <meta
        name="description"
        content="Pages Router + client ViewModelStore + withViewModel and hydration"
      />
    </Head>
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
  </>
);

export default HomePage;
