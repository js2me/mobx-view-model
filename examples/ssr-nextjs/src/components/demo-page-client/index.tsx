'use client';

import { ViewModelProps, withViewModel } from 'mobx-view-model';
import { DemoPageArticle } from './ui/demo-page-article';
import { DemoPageVM } from './model';

export const DemoPageClient = withViewModel(
  DemoPageVM,
  ({ model }: ViewModelProps<DemoPageVM>) => (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Demo page</h1>
      <DemoPageArticle />
    </div>
  ),
  {
    id: 'demo-home-vm',
    fallback: () => (
      <div className="mt-6 flex flex-col gap-2 rounded-xl border border-dashed border-demo-border px-6 py-5 text-sm text-demo-muted">
        <p className="m-0">Loading view model…</p>
        <p className="m-0">
          On SSR and the first hydration frame you often see this fallback:{' '}
          <code>attach</code>{' '}
          to the store runs in an effect after the first render.
        </p>
      </div>
    ),
  },
);
