'use client';

import { ViewModelProps, withViewModel } from 'mobx-view-model';
import { DemoPageVM, DemoPagePayload } from './model';

const DemoView = withViewModel(
  DemoPageVM,
  ({ model }: ViewModelProps<DemoPageVM>) => (
    <article className="demo-card">
      <h2>{model.payload.headline}</h2>
      <p className="muted">Server timestamp: {model.payload.serverRenderedAt}</p>
      <p>
        Client clicks (MobX on the ViewModel):{' '}
        <strong>{model.clientInteractions}</strong>
      </p>
      <button type="button" onClick={() => model.bump()}>
        +1 on ViewModel
      </button>
    </article>
  ),
  {
    id: 'demo-home-vm',
    fallback: () => (
      <div className="demo-fallback">
        <p>Loading view model…</p>
        <p className="muted">
          On SSR and the first hydration frame you often see this fallback:{' '}
          <code>attach</code> to the store runs in an effect after the first render.
        </p>
      </div>
    ),
  },
);

export function DemoPageClient(props: { initialPayload: DemoPagePayload }) {
  return <DemoView payload={props.initialPayload} />;
}
