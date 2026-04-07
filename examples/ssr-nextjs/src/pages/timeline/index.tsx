import Head from 'next/head';
import type { GetServerSideProps, NextPage } from 'next';
import type { DemoPagePayload } from '@/components/demo-page-client/model';
import { loadDemoPayload } from '@/shared/api/load-demo-payload';
import {
  mergeRootStorePageProps,
  type WithRootStorePageProps,
} from '@/shared/lib/root-store-server-props';
import { TimelineDemoClient } from '@/components/pages/timeline-demo-client';

type TimelinePageProps = WithRootStorePageProps<{
  initialPayload: DemoPagePayload;
}>;

export const getServerSideProps: GetServerSideProps<TimelinePageProps> =
  async () => {
    const initialPayload = await loadDemoPayload({
      pageTitle: 'Timeline',
      headline: 'Another server headline — MobX state is scoped to this page',
      bumpable: false,
    });
    return { props: mergeRootStorePageProps({ initialPayload }) };
  };

const TimelinePage: NextPage<TimelinePageProps> = ({ initialPayload }) => (
  <>
    <Head>
      <title>Timeline · mobx-view-model SSR</title>
    </Head>
    <main className="mx-auto max-w-[40rem] px-5 pb-16 pt-8">
      <p className="mb-6 text-sm text-demo-muted">
        The button is disabled (<code className="text-demo-fg">bumpable: false</code>
        ) to show payload-driven UI; VM id is{' '}
        <code className="text-demo-fg">demo-timeline-vm</code>.
      </p>
      <TimelineDemoClient payload={initialPayload} />
    </main>
  </>
);

export default TimelinePage;
