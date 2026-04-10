import { withViewModel } from 'mobx-view-model';
import { DemoPageArticle } from '../demo-page-client/ui/demo-page-article.js';
import { DemoPageFallback } from '../demo-page-client/ui/demo-page-fallback.js';
import { DemoPageVM } from '../demo-page-client/model.js';

export const TimelineDemoClient = withViewModel(
  DemoPageVM,
  ({ model }) => (
    <div className="flex flex-col gap-8">
      <header className="relative border-l-2 border-demo-accent/70 pl-5">
        <span
          className="absolute -left-[5px] top-2 block h-2.5 w-2.5 rounded-full bg-demo-accent"
          aria-hidden
        />
        <p className="text-xs font-semibold uppercase tracking-wide text-demo-accent">
          Timeline
        </p>
        <h1 className="mt-1 text-2xl font-semibold">
          {model.payload.pageTitle ?? 'Timeline'}
        </h1>
        <p className="mt-2 max-w-prose text-sm text-demo-muted">
          Same ViewModel stack as other demo routes; only this shell is
          route-specific.
        </p>
      </header>
      <DemoPageArticle />
    </div>
  ),
  {
    id: 'demo-timeline-vm',
    fallback: DemoPageFallback,
  },
);
