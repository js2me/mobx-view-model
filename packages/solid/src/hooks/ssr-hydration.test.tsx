import { cleanup, render, waitFor } from '@solidjs/testing-library';
import { enableObservableTracking } from 'mobx-solid';
import { viewModelsConfig } from 'mobx-view-model';
import { Suspense } from 'solid-js';
import { hydrate } from 'solid-js/web';
import { afterEach, expect, test, vi } from 'vitest';
import { ViewModelsProvider } from '../components/index.js';
import { withViewModel } from '../hoc/index.js';
import { ViewModelBaseMock, ViewModelStoreBaseMock } from '../lib/test-mocks.js';

enableObservableTracking();

afterEach(() => {
  cleanup();
  document.body.replaceChildren();
  Reflect.deleteProperty(globalThis, '_$HY');
});

const installHydrationRuntime = () => {
  Object.assign(globalThis, {
    _$HY: { events: [], completed: new WeakSet(), r: {}, fe() {} },
  });
};

test('hydrates a synchronously mounted VM without replacing its view', () => {
  const store = new ViewModelStoreBaseMock({});
  class PageVM extends ViewModelBaseMock {}
  const Page = withViewModel(PageVM, ({ model }) => (
    <span data-testid="view">{model.id}</span>
  ), { id: 'page' });

  const container = document.createElement('div');
  // Exact markup asserted by module-load.ssr.test.tsx in the Node SSR build.
  container.innerHTML = '<span data-hk="00010000" data-testid="view">page</span>';
  document.body.appendChild(container);
  const original = container.querySelector('[data-testid="view"]');
  installHydrationRuntime();
  const dispose = hydrate(() => (
    <ViewModelsProvider value={store}><Page /></ViewModelsProvider>
  ), container);

  try {
    expect(container.querySelector('[data-testid="view"]')).toBe(original);
    expect(store.get<PageVM>('page')?.isMounted).toBe(true);
  } finally {
    dispose();
  }
});

test('hydrates an async SSR Suspense fallback and reveals the mounted view', async () => {
  const previousMode = viewModelsConfig.mode;
  viewModelsConfig.mode = 'ssr';
  const store = new ViewModelStoreBaseMock({});
  let finishMount!: () => void;
  class PageVM extends ViewModelBaseMock {
    protected willMount() {
      return new Promise<void>((resolve) => { finishMount = resolve; });
    }
  }
  const Page = withViewModel(PageVM, () => <span data-testid="view">Ready</span>, {
    id: 'async-page',
    fallback: () => <span data-testid="fallback">Loading</span>,
  });

  const container = document.createElement('div');
  // Shell markup asserted by module-load.ssr.test.tsx in the server build.
  container.innerHTML = '<span data-hk="0000F0" data-testid="loading">Loading</span><script>self.$R=self.$R||[];_$HY.r["0000"]="$$f";</script>';
  document.body.appendChild(container);
  installHydrationRuntime();
  (globalThis as any)._$HY.r['0000'] = '$$f';
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  let dispose: (() => void) | undefined;
  try {
    dispose = hydrate(() => (
      <ViewModelsProvider value={store}>
        <Suspense fallback={<span data-testid="loading">Loading</span>}>
          <Page />
        </Suspense>
      </ViewModelsProvider>
    ), container);

    expect(container.textContent).toContain('Loading');
    expect(container.querySelector('[data-testid="view"]')).toBeNull();
    expect(store.get<PageVM>('async-page')?.isMounted).toBe(false);

    finishMount();
    await waitFor(() => {
      expect(store.get<PageVM>('async-page')?.isMounted).toBe(true);
    });
    expect(container.querySelector('[data-testid="view"]')?.textContent).toBe('Ready');
    expect(errors).not.toHaveBeenCalled();
  } finally {
    finishMount?.();
    dispose?.();
    errors.mockRestore();
    viewModelsConfig.mode = previousMode;
  }
});

test('a client-only async VM shows its fallback until mount completes', async () => {
  const previousMode = viewModelsConfig.mode;
  viewModelsConfig.mode = 'csr-only';
  const store = new ViewModelStoreBaseMock({});
  let finishMount!: () => void;
  class PageVM extends ViewModelBaseMock {
    protected willMount() {
      return new Promise<void>((resolve) => { finishMount = resolve; });
    }
  }
  const Page = withViewModel(PageVM, () => <span data-testid="view">Ready</span>, {
    id: 'client-page',
    fallback: () => <span data-testid="fallback">Loading</span>,
  });
  try {
    const page = render(() => (
      <ViewModelsProvider value={store}><Page /></ViewModelsProvider>
    ));
    expect(store.get<PageVM>('client-page')?.isMounted).toBe(false);
    expect(page.container.querySelector('[data-testid="fallback"]')?.textContent).toBe('Loading');
    expect(page.container.querySelector('[data-testid="view"]')).toBeNull();
    finishMount();
    await waitFor(() => {
      expect(page.container.querySelector('[data-testid="view"]')?.textContent).toBe('Ready');
    });
    expect(store.get<PageVM>('client-page')?.isMounted).toBe(true);
  } finally {
    finishMount?.();
    viewModelsConfig.mode = previousMode;
  }
});
