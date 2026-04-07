import Head from 'next/head';
import type { GetServerSideProps, NextPage } from 'next';
import type { DemoPagePayload } from '@/components/demo-page-client/model';
import { loadDemoPayload } from '@/shared/api/load-demo-payload';
import {
  mergeRootStorePageProps,
  type WithRootStorePageProps,
} from '@/shared/lib/root-store-server-props';
import { WidgetsDemoClient } from '@/components/pages/widgets-demo-client';

type WidgetsPageProps = WithRootStorePageProps<{
  initialPayload: DemoPagePayload;
}>;

export const getServerSideProps: GetServerSideProps<WidgetsPageProps> =
  async () => {
    const initialPayload = await loadDemoPayload({
      pageTitle: 'Widgets',
      headline: 'SSR payload for the Widgets route — separate ViewModel id',
    });
    return { props: mergeRootStorePageProps({ initialPayload }) };
  };

const WidgetsPage: NextPage<WidgetsPageProps> = ({ initialPayload }) => (
  <>
    <Head>
      <title>Widgets · mobx-view-model SSR</title>
    </Head>
    <main className="mx-auto max-w-[40rem] px-5 pb-16 pt-8">
      <p className="mb-6 text-sm text-demo-muted">
        Counters here are independent from Home and Timeline because this
        screen uses <code className="text-demo-fg">demo-widgets-vm</code> in
        the store.
      </p>
      <WidgetsDemoClient payload={initialPayload} />
    </main>
  </>
);

export default WidgetsPage;
