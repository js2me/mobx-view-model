import { withViewModel } from 'mobx-view-model';
import { DemoPageVM } from './model.js';
import { DemoPageArticle } from './ui/demo-page-article.js';
import { DemoPageFallback } from './ui/demo-page-fallback.js';

export const DemoPageClient = withViewModel(
  DemoPageVM,
  ({ model }) => (
    <div className="flex flex-col gap-4">
      <h1 className="font-semibold text-2xl">
        {model.payload.pageTitle ?? 'Demo page'}
      </h1>
      <h1 className="font-semibold text-2xl">{model.title}</h1>
      <DemoPageArticle />
    </div>
  ),
  {
    fallback: DemoPageFallback,
  },
);
