import { withViewModel } from 'mobx-view-model';
import { DemoPageVM } from '../demo-page-client/model.js';
import { DemoPageArticle } from '../demo-page-client/ui/demo-page-article.js';
import { DemoPageFallback } from '../demo-page-client/ui/demo-page-fallback.js';

export const TimelineDemoClient = withViewModel(
  DemoPageVM,
  ({ model }) => (
    <div className="flex flex-col gap-8">
      <header className="relative border-demo-accent/70 border-l-2 pl-5">
        <span
          className="-left-[5px] absolute top-2 block h-2.5 w-2.5 rounded-full bg-demo-accent"
          aria-hidden
        />
        <p className="font-semibold text-demo-accent text-xs uppercase tracking-wide">
          Timeline
        </p>
        <h1 className="mt-1 font-semibold text-2xl">
          {model.payload.pageTitle ?? 'Timeline'}
        </h1>
        <p className="mt-2 max-w-prose text-demo-muted text-sm">
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
