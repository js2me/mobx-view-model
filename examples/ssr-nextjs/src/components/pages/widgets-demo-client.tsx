'use client';

import { withViewModel } from 'mobx-view-model-react';
import { DemoPageArticle } from '@/components/demo-page-client/ui/demo-page-article';
import { DemoPageFallback } from '@/components/demo-page-client/ui/demo-page-fallback';
import { DemoPageVM } from '@/components/demo-page-client/model';

export const WidgetsDemoClient = withViewModel(
  DemoPageVM,
  ({ model }) => (
    <div className="flex flex-col gap-6">
      <header className="rounded-2xl border border-dashed border-demo-accent/45 bg-demo-card/60 px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-demo-accent/25 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-demo-accent">
            Widgets
          </span>
          <code className="rounded bg-demo-border/40 px-2 py-0.5 text-xs text-demo-muted">
            demo-widgets-vm
          </code>
        </div>
        <h1 className="mt-3 text-2xl font-semibold">
          {model.payload.pageTitle ?? 'Widgets'}
        </h1>
        <p className="mt-2 max-w-prose text-sm text-demo-muted">
          This header is widgets-only; the card below still uses the shared
          article + MobX counter from the same ViewModel.
        </p>
      </header>
      <DemoPageArticle />
    </div>
  ),
  {
    id: 'demo-widgets-vm',
    fallback: DemoPageFallback,
  },
);
