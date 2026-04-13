'use client';

import { withViewModel } from 'mobx-view-model';
import { DemoPageFallback } from './ui/demo-page-fallback';
import { DemoPageArticle } from './ui/demo-page-article';
import { VMComponent } from './ui/nested-vm-component';
import { DemoPageVM } from './model';

/** Home route — distinct VM id so each page keeps its own MobX state. */
export const DemoPageClient = withViewModel(
  DemoPageVM,
  ({ model }) => (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">
        {model.payload.pageTitle ?? 'Demo page'}
      </h1>
      <h1 className="text-2xl font-semibold">
        {model.title}
      </h1>
      <DemoPageArticle />
      <VMComponent
        payload={{
          title: 'VMComponent with static id',
          note: 'This VMComponent renders another VMComponent with a dynamic id inside.',
        }}
      />
    </div>
  ),
  {
    fallback: DemoPageFallback,
  },
);
