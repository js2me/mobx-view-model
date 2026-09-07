import { withViewModel } from 'mobx-view-model-react';
import { DemoPageVM } from '../demo-page-client/model.js';
import { DemoPageArticle } from '../demo-page-client/ui/demo-page-article.js';
import { DemoPageFallback } from '../demo-page-client/ui/demo-page-fallback.js';

export const WidgetsDemoClient = withViewModel(
  DemoPageVM,
  ({ model }) => (
    <div className="flex flex-col gap-6">
      <header className="rounded-2xl border border-demo-accent/45 border-dashed bg-demo-card/60 px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-demo-accent/25 px-2.5 py-1 font-semibold text-demo-accent text-xs uppercase tracking-wide">
            Widgets
          </span>
          <code className="rounded bg-demo-border/40 px-2 py-0.5 text-demo-muted text-xs">
            demo-widgets-vm
          </code>
        </div>
        <h1 className="mt-3 font-semibold text-2xl">
          {model.payload.pageTitle ?? 'Widgets'}
        </h1>
        <p className="mt-2 max-w-prose text-demo-muted text-sm">
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
