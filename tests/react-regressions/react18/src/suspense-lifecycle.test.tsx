import { act, cleanup, render, screen } from '@testing-library/react';
import { ViewModelBase, ViewModelStoreBase } from 'mobx-view-model';
import { useCreateViewModel, ViewModelsProvider } from 'mobx-view-model-react';
import {
  Component,
  type ReactNode,
  StrictMode,
  Suspense,
  startTransition,
  useState,
} from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';

class TestStore extends ViewModelStoreBase {
  constructor() {
    super({});
  }
}

// Keep the promise stable across retries, including retries before first commit.
function resource() {
  let status: 'pending' | 'resolved' | 'rejected' = 'pending';
  let failure: Error;
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return {
    resolve() {
      status = 'resolved';
      resolve();
    },
    reject(error: Error) {
      status = 'rejected';
      failure = error;
      resolve();
    },
    read() {
      if (status === 'pending') throw promise;
      if (status === 'rejected') throw failure;
    },
  };
}

class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    return this.state.error ? (
      <span data-testid="error">{this.state.error.message}</span>
    ) : (
      this.props.children
    );
  }
}

// Keep this suite identical in the React 18 and React 19 fixtures.
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe.each([false, true])('Suspense lifecycle (StrictMode=%s)', (strict) => {
  function mount(children: ReactNode) {
    return render(strict ? <StrictMode>{children}</StrictMode> : children);
  }

  test('unmounting a suspended root prevents a late resource from mounting a VM', async () => {
    const store = new TestStore();
    const pending = resource();
    const mounted = vi.fn();
    class PageVM extends ViewModelBase {
      override didMount() {
        mounted();
        super.didMount();
      }
    }
    const Page = () => {
      useCreateViewModel(PageVM, {}, { id: 'page' });
      pending.read();
      return <span data-testid="page">ready</span>;
    };
    const view = mount(
      <ViewModelsProvider value={store}>
        <Suspense fallback={<span data-testid="loading">loading</span>}>
          <Page />
        </Suspense>
      </ViewModelsProvider>,
    );
    expect(screen.getByTestId('loading')).toBeDefined();
    expect(store.getIds(PageVM)).toEqual([]);
    view.unmount();
    await act(async () => pending.resolve());
    expect(mounted).not.toHaveBeenCalled();
    expect(store.getIds(PageVM)).toEqual([]);
    expect(screen.queryByTestId('page')).toBeNull();
  });

  test('repeated hide and reveal cycles preserve the committed VM identity', async () => {
    const store = new TestStore();
    class PageVM extends ViewModelBase {}
    const resources = [resource(), resource()];
    let update!: (revision: number) => void;
    const Page = ({ revision }: { revision: number }) => {
      const model = useCreateViewModel(PageVM, {}, { id: 'page' });
      if (revision > 0) resources[revision - 1].read();
      return <span data-testid="page">{`${model.id}:${revision}`}</span>;
    };
    const App = () => {
      const [revision, setRevision] = useState(0);
      update = setRevision;
      return (
        <Suspense fallback={<span data-testid="loading">loading</span>}>
          <Page revision={revision} />
        </Suspense>
      );
    };
    const view = mount(
      <ViewModelsProvider value={store}>
        <App />
      </ViewModelsProvider>,
    );
    const model = store.get<PageVM>('page')!;
    expect(model.isMounted).toBe(true);
    for (const revision of [1, 2]) {
      await act(async () => update(revision));
      expect(screen.getByTestId('loading')).toBeDefined();
      await act(async () => resources[revision - 1].resolve());
      expect(screen.queryByTestId('loading')).toBeNull();
      expect(screen.getByTestId('page').textContent).toBe(`page:${revision}`);
      expect(store.getAll(PageVM)).toEqual([model]);
      expect(model.isMounted).toBe(true);
    }
    view.unmount();
    expect(store.getIds(PageVM)).toEqual([]);
    expect(model.isMounted).toBe(false);
  });

  test('a superseded transition cannot apply its payload after a late resolution', async () => {
    const store = new TestStore();
    class PageVM extends ViewModelBase<{ value: string }> {}
    const stale = resource();
    const latest = resource();
    let update!: (value: string) => void;
    const Page = ({ value }: { value: string }) => {
      useCreateViewModel(PageVM, { value }, { id: 'page' });
      if (value === 'stale') stale.read();
      if (value === 'latest') latest.read();
      return <span data-testid="page">{value}</span>;
    };
    const App = () => {
      const [value, setValue] = useState('initial');
      update = (next) => startTransition(() => setValue(next));
      return (
        <Suspense fallback="loading">
          <Page value={value} />
        </Suspense>
      );
    };
    const view = mount(
      <ViewModelsProvider value={store}>
        <App />
      </ViewModelsProvider>,
    );
    const model = store.get<PageVM>('page')!;
    await act(async () => update('stale'));
    await act(async () => update('latest'));
    expect(screen.getByTestId('page').textContent).toBe('initial');
    expect(model.payload.value).toBe('initial');
    await act(async () => latest.resolve());
    expect(screen.getByTestId('page').textContent).toBe('latest');
    expect(model.payload.value).toBe('latest');
    await act(async () => stale.resolve());
    expect(screen.getByTestId('page').textContent).toBe('latest');
    expect(model.payload.value).toBe('latest');
    expect(store.getAll(PageVM)).toEqual([model]);
    view.unmount();
    expect(store.getIds(PageVM)).toEqual([]);
  });

  test('discarding a suspended consumer does not release another owner of the same ID', async () => {
    const store = new TestStore();
    class SharedVM extends ViewModelBase {}
    const pending = resource();
    let showPending!: (show: boolean) => void;
    const Consumer = ({ suspend = false }: { suspend?: boolean }) => {
      const model = useCreateViewModel(SharedVM, {}, { id: 'shared' });
      if (suspend) pending.read();
      return <span data-testid={suspend ? 'second' : 'first'}>{model.id}</span>;
    };
    const App = () => {
      const [show, setShow] = useState(false);
      showPending = setShow;
      return (
        <>
          <Consumer />
          {show && (
            <Suspense fallback={<span data-testid="loading">loading</span>}>
              <Consumer suspend />
            </Suspense>
          )}
        </>
      );
    };
    const view = mount(
      <ViewModelsProvider value={store}>
        <App />
      </ViewModelsProvider>,
    );
    const model = store.get<SharedVM>('shared')!;
    await act(async () => showPending(true));
    expect(screen.getByTestId('loading')).toBeDefined();
    await act(async () => showPending(false));
    await act(async () => pending.resolve());
    expect(screen.getByTestId('first').textContent).toBe('shared');
    expect(screen.queryByTestId('second')).toBeNull();
    expect(store.getAll(SharedVM)).toEqual([model]);
    expect(model.isMounted).toBe(true);
    view.unmount();
    expect(store.getIds(SharedVM)).toEqual([]);
    expect(model.isMounted).toBe(false);
  });

  test('a fallback VM is released on reveal and a new fallback is cleaned up on unmount', async () => {
    const store = new TestStore();
    class PageVM extends ViewModelBase {}
    class FallbackVM extends ViewModelBase {}
    const first = resource();
    const second = resource();
    const Fallback = () => {
      useCreateViewModel(FallbackVM, {}, { id: 'fallback' });
      return <span data-testid="loading">loading</span>;
    };
    const Page = ({ next }: { next: boolean }) => {
      useCreateViewModel(PageVM, {}, { id: 'page' });
      (next ? second : first).read();
      return <span data-testid="page">ready</span>;
    };
    let update!: () => void;
    const App = () => {
      const [next, setNext] = useState(false);
      update = () => setNext(true);
      return (
        <Suspense fallback={<Fallback />}>
          <Page next={next} />
        </Suspense>
      );
    };
    const view = mount(
      <ViewModelsProvider value={store}>
        <App />
      </ViewModelsProvider>,
    );
    const fallback = store.get<FallbackVM>('fallback')!;
    expect(fallback.isMounted).toBe(true);
    expect(store.getIds(PageVM)).toEqual([]);
    await act(async () => first.resolve());
    expect(screen.getByTestId('page')).toBeDefined();
    expect(store.getIds(FallbackVM)).toEqual([]);
    expect(fallback.isMounted).toBe(false);
    await act(async () => update());
    expect(screen.getByTestId('loading')).toBeDefined();
    const nextFallback = store.get<FallbackVM>('fallback')!;
    expect(nextFallback).not.toBe(fallback);
    expect(nextFallback.isMounted).toBe(true);
    view.unmount();
    await act(async () => second.resolve());
    expect(store.getIds(PageVM)).toEqual([]);
    expect(store.getIds(FallbackVM)).toEqual([]);
    expect(nextFallback.isMounted).toBe(false);
  });

  test('equal IDs in different providers remain isolated across Suspense retries', async () => {
    const firstStore = new TestStore();
    const secondStore = new TestStore();
    class PageVM extends ViewModelBase {}
    const first = resource();
    const second = resource();
    const Page = ({
      data,
      label,
    }: {
      data: ReturnType<typeof resource>;
      label: string;
    }) => {
      useCreateViewModel(PageVM, {}, { id: 'page' });
      data.read();
      return <span data-testid={label}>ready</span>;
    };
    const view = mount(
      <>
        <ViewModelsProvider value={firstStore}>
          <Suspense fallback="first loading">
            <Page data={first} label="first" />
          </Suspense>
        </ViewModelsProvider>
        <ViewModelsProvider value={secondStore}>
          <Suspense fallback="second loading">
            <Page data={second} label="second" />
          </Suspense>
        </ViewModelsProvider>
      </>,
    );
    await act(async () => second.resolve());
    const secondModel = secondStore.get<PageVM>('page')!;
    expect(screen.getByTestId('second')).toBeDefined();
    expect(firstStore.getIds(PageVM)).toEqual([]);
    await act(async () => first.resolve());
    const firstModel = firstStore.get<PageVM>('page')!;
    expect(screen.getByTestId('first')).toBeDefined();
    expect(firstModel).not.toBe(secondModel);
    expect(firstModel.isMounted).toBe(true);
    expect(secondStore.getAll(PageVM)).toEqual([secondModel]);
    expect(secondModel.isMounted).toBe(true);
    view.unmount();
    expect(firstStore.getIds(PageVM)).toEqual([]);
    expect(secondStore.getIds(PageVM)).toEqual([]);
  });

  test('a rejected resource replaces a revealed page with an error and releases its VM', async () => {
    const store = new TestStore();
    class PageVM extends ViewModelBase {}
    const pending = resource();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    let update!: () => void;
    const Page = ({ suspend }: { suspend: boolean }) => {
      useCreateViewModel(PageVM, {}, { id: 'page' });
      if (suspend) pending.read();
      return <span data-testid="page">ready</span>;
    };
    const App = () => {
      const [suspend, setSuspend] = useState(false);
      update = () => startTransition(() => setSuspend(true));
      return (
        <ErrorBoundary>
          <Suspense fallback="loading">
            <Page suspend={suspend} />
          </Suspense>
        </ErrorBoundary>
      );
    };
    mount(
      <ViewModelsProvider value={store}>
        <App />
      </ViewModelsProvider>,
    );
    const model = store.get<PageVM>('page')!;
    await act(async () => update());
    expect(model.isMounted).toBe(true);
    expect(screen.getByTestId('page')).toBeDefined();
    const failure = new Error('resource failed');
    const onError = (event: ErrorEvent) => {
      if (event.error === failure) event.preventDefault();
    };
    window.addEventListener('error', onError);
    try {
      await act(async () => pending.reject(failure));
    } finally {
      window.removeEventListener('error', onError);
    }
    expect(screen.getByTestId('error').textContent).toBe('resource failed');
    expect(screen.queryByTestId('page')).toBeNull();
    expect(store.getIds(PageVM)).toEqual([]);
    expect(model.isMounted).toBe(false);
  });
});
