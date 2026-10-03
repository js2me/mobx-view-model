import { render, screen, waitFor } from '@solidjs/testing-library';
import { createSignal } from 'solid-js';
import { describe, expect, it } from 'vitest';
import { ViewModelsProvider } from '../components/index.js';
import { ViewModelStoreBaseMock, ViewModelBaseMock } from '../lib/test-mocks.js';
import { withPropsViewModel } from './with-props-view-model.js';

describe('withPropsViewModel', () => {
  it('takes a fresh shallow snapshot when either prop changes', async () => {
    const received: Array<{ label: string; count: number }> = [];

    class SimpleVM {
      setPayload(payload: { label: string; count: number }) {
        received.push(payload);
      }
    }

    const [label, setLabel] = createSignal('first');
    const [count, setCount] = createSignal(1);
    const Page = withPropsViewModel(SimpleVM, () => <span>page</span>);

    render(() => <Page label={label()} count={count()} />);
    expect(received).toHaveLength(1);
    expect(received[0]).toEqual({ label: 'first', count: 1 });

    setCount(2);
    await waitFor(() => expect(received.at(-1)).toEqual({ label: 'first', count: 2 }));
    expect(received.at(-1)).not.toBe(received[0]);

    setLabel('second');
    await waitFor(() => expect(received.at(-1)).toEqual({ label: 'second', count: 2 }));
  });

  it('updates the full VM payload and retains the store instance', async () => {
    class PageVM extends ViewModelBaseMock<{ label: string; count: number }> {}

    const store = new ViewModelStoreBaseMock();
    const [label, setLabel] = createSignal('first');
    const Page = withPropsViewModel(PageVM, ({ model }) => (
      <span>{model.payload.label}</span>
    ), { id: 'props-page' });

    render(() => (
      <ViewModelsProvider value={store}>
        <Page label={label()} count={1} />
      </ViewModelsProvider>
    ));

    expect(screen.getByText('first')).toBeDefined();
    const model = store.get<PageVM>('props-page');
    expect(model?.payload).toEqual({ label: 'first', count: 1 });

    setLabel('second');
    await waitFor(() => expect(model?.payload).toEqual({ label: 'second', count: 1 }));
    expect(await screen.findByText('second')).toBeDefined();
    expect(store.get(PageVM)).toBe(model);
  });
});
