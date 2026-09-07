import { observer } from 'mobx-react-lite';
import { useViewModel, withViewModel } from 'mobx-view-model-react';
import { CounterVM } from './model.js';

const CounterBody = observer(() => {
  const model = useViewModel(CounterVM);
  return (
    <section className="card">
      <h2>{model.payload.headline}</h2>
      <p>Current clicks: <strong>{model.clicks}</strong></p>
      <button className="btn" type="button" onClick={model.bump}>
        +1 on ViewModel
      </button>
    </section>
  );
});

export const Counter = withViewModel(
  CounterVM,
  () => <CounterBody />,
  {
    id: 'csr-react18-counter',
  },
);
