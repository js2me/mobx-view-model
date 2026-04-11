'use client';

import { withViewModel } from 'mobx-view-model';
import { VM } from '@/shared/lib/vm';

type NestedVmPayload = {
  title: string;
  note: string;
};

class NestedDemoVM extends VM<NestedVmPayload> {}

const DynamicVMComponent = withViewModel(NestedDemoVM, ({ model }) => (
  <div className="rounded-xl border border-dashed border-demo-accent/40 bg-demo-card/70 p-4">
    <p className="text-sm font-semibold">{model.payload.title}</p>
    <p className="mt-1 text-sm text-demo-muted">{model.payload.note}</p>
    <code className="mt-3 inline-flex rounded bg-demo-border/40 px-2 py-1 text-xs text-demo-muted">
      {model.id}
    </code>
  </div>
));

export const VMComponent = withViewModel(
  NestedDemoVM,
  ({ model }) => (
    <section className="mt-6 rounded-2xl border border-demo-border bg-demo-card/80 px-6 py-5">
      <p className="text-sm font-semibold">{model.payload.title}</p>
      <p className="mt-1 text-sm text-demo-muted">{model.payload.note}</p>
      <code className="mt-3 inline-flex rounded bg-demo-border/40 px-2 py-1 text-xs text-demo-muted">
        {model.id}
      </code>
      <div className="mt-4">
        <DynamicVMComponent
          payload={{
            title: 'VMComponent with dynamic id',
            note: 'This nested VMComponent is created without a fixed id.',
          }}
        />
      </div>
    </section>
  ),
  {
    id: 'demo-nested-static-vm',
  },
);
