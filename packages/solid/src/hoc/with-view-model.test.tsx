import { render, screen, waitFor } from '@solidjs/testing-library';
import { createSignal } from 'solid-js';
import { describe, expect, it, vi } from 'vitest';
import { ViewModelsProvider } from '../components/index.js';
import { ViewModelStoreBaseMock, ViewModelBaseMock } from '../lib/test-mocks.js';
import { withViewModel } from './with-view-model.js';

describe('withViewModel', () => {
  it('updates a full VM payload without replacing the store instance', async () => {
    class PageVM extends ViewModelBaseMock<{ label: string }> {}

    const store = new ViewModelStoreBaseMock();
    const [label, setLabel] = createSignal('first');
    const Page = withViewModel(PageVM, ({ model }) => (
      <span>{model.payload.label}</span>
    ), { id: 'page' });

    render(() => (
      <ViewModelsProvider value={store}>
        <Page payload={{ label: label() }} />
      </ViewModelsProvider>
    ));

    expect(screen.getByText('first')).toBeDefined();
    const model = store.get(PageVM);
    expect(model).toBeInstanceOf(PageVM);

    setLabel('second');
    await waitFor(() => expect(store.get<PageVM>('page')?.payload.label).toBe('second'));
    expect(await screen.findByText('second')).toBeDefined();
    expect(store.get(PageVM)).toBe(model);
    expect(store.getIds(PageVM)).toEqual(['page']);
  });

  it('updates a simple VM and unregisters it when the view unmounts', async () => {
    const received: string[] = [];

    class SimpleVM {
      id?: string;
      mount = vi.fn();
      unmount = vi.fn();

      setPayload(payload: { label: string }) {
        received.push(payload.label);
      }
    }

    const store = new ViewModelStoreBaseMock();
    const [label, setLabel] = createSignal('first');
    const Page = withViewModel(SimpleVM, ({ model }) => (
      <span>{model.id}</span>
    ));

    const view = render(() => (
      <ViewModelsProvider value={store}>
        <Page payload={{ label: label() }} />
      </ViewModelsProvider>
    ));

    const model = store.get(SimpleVM);
    expect(model).toBeInstanceOf(SimpleVM);
    expect(model?.mount).toHaveBeenCalledOnce();
    expect(received).toEqual(['first']);

    setLabel('second');
    await waitFor(() => expect(received).toContain('second'));
    expect(store.get(SimpleVM)).toBe(model);

    view.unmount();
    expect(model?.unmount).toHaveBeenCalledOnce();
    expect(store.get(SimpleVM)).toBeNull();
    expect(store.get(model!.id!)).toBeNull();
  });

  it('registers an anchor connected to the HOC', () => {
    class PageVM extends ViewModelBaseMock {}

    const store = new ViewModelStoreBaseMock();
    const Anchor = () => <span>anchor</span>;
    const Page = withViewModel(PageVM, ({ model }) => <span>{model.id}</span>, {
      id: 'anchored',
    });
    Page.connect(Anchor);

    render(() => (
      <ViewModelsProvider value={store}>
        <Page />
      </ViewModelsProvider>
    ));

    expect(store.get(Anchor)).toBe(store.get(PageVM));
    expect(store.get(Anchor)?.id).toBe('anchored');
  });
});
