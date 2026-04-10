import { observer } from 'mobx-react-lite';
import { DemoPageVM } from '../model.js';
import { useViewModel } from 'mobx-view-model';

export const DemoPageArticle = observer(() => {
  const model = useViewModel(DemoPageVM);

  return (
    <article className="mt-6 rounded-xl border border-demo-border bg-demo-card px-6 py-5">
      <h2 className="mb-3 text-lg font-semibold">{model.payload.headline}</h2>
      <p className="text-sm text-demo-muted">
        Server timestamp: {model.payload.serverRenderedAt}
      </p>
      <p>
        Client clicks (MobX on the ViewModel):{' '}
        <strong>{model.clientInteractions}</strong>
      </p>
      <button
        type="button"
        className="mt-4 cursor-pointer rounded-full border-0 bg-demo-accent px-4 py-2 font-semibold text-white hover:brightness-110 disabled:cursor-not-allowed disabled:bg-neutral-600 disabled:opacity-90"
        disabled={!model.payload.bumpable}
        onClick={model.bump}
      >
        +1 on ViewModel
      </button>
    </article>
  );
});
