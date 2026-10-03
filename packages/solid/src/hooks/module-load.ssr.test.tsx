/**
 * @vitest-environment node
 */
import { expect, test, vi } from 'vitest';

test('imports the Solid bindings without window and mounts during SSR', async () => {
  expect(typeof window).toBe('undefined');
  const { _internals, ViewModelBase, viewModelsConfig } =
    await import('mobx-view-model');
  const { isServer, renderToString } = await import('solid-js/web');
  const { withViewModel } = await import('../index.js');

  expect(_internals.isClient).toBe(false);
  expect(isServer).toBe(true);

  let mounts = 0;
  class PageVM extends ViewModelBase<{}> {
    protected willMount() { mounts++; }
  }
  const Page = withViewModel(PageVM, ({ model }) => (
    <span data-testid="view">{model.vm.state}</span>
  ));
  const previousMode = viewModelsConfig.mode;
  try {
    viewModelsConfig.mode = 'ssr';
    const html = renderToString(() => Page({}));
    expect(html).toContain('mounted');
    expect(mounts).toBe(1);
  } finally {
    viewModelsConfig.mode = previousMode;
  }
});

test('emits the markup used by the client hydration fixture', async () => {
  const { ViewModelBase, ViewModelStoreBase } = await import('mobx-view-model');
  const { renderToString } = await import('solid-js/web');
  const { ViewModelsProvider, withViewModel } = await import('../index.js');

  class PageVM extends ViewModelBase<{}> {}
  const store = new ViewModelStoreBase({});
  const Page = withViewModel(PageVM, ({ model }) => (
    <span data-testid="view">{model.id}</span>
  ), { id: 'page' });
  const html = renderToString(() => (
    <ViewModelsProvider value={store}><Page /></ViewModelsProvider>
  ));
  expect(html).toBe('<span data-hk="00010000" data-testid="view">page</span>');
});

test('emits the Suspense fallback used by async hydration', async () => {
  const { ViewModelBase, ViewModelStoreBase, viewModelsConfig } =
    await import('mobx-view-model');
  const { Suspense } = await import('solid-js');
  const { renderToString } = await import('solid-js/web');
  const { ViewModelsProvider, withViewModel } = await import('../index.js');

  let resolveMount!: () => void;
  class PageVM extends ViewModelBase<{}> {
    protected willMount() {
      return new Promise<void>((resolve) => { resolveMount = resolve; });
    }
  }
  const store = new ViewModelStoreBase({});
  const Page = withViewModel(PageVM, () => <span data-testid="view">Ready</span>, {
    id: 'async-page',
    fallback: () => <span data-testid="fallback">Loading</span>,
  });
  const previousMode = viewModelsConfig.mode;
  try {
    viewModelsConfig.mode = 'ssr';
    const html = renderToString(() => (
      <ViewModelsProvider value={store}>
        <Suspense fallback={<span data-testid="loading">Loading</span>}>
          <Page />
        </Suspense>
      </ViewModelsProvider>
    ));
    expect(html).toBe('<span data-hk="0000F0" data-testid="loading">Loading</span><script>self.$R=self.$R||[];_$HY.r["0000"]="$$f";</script>');
  } finally {
    resolveMount?.();
    viewModelsConfig.mode = previousMode;
  }
});

const createAsyncSsrFixture = async () => {
  const { ViewModelBase, viewModelsConfig } = await import('mobx-view-model');
  const { createComponent } = await import('solid-js/web');
  const { Suspense } = await import('solid-js');
  const { withViewModel } = await import('../index.js');

  let resolveMount!: () => void;
  const pending = new Promise<void>((resolve) => { resolveMount = resolve; });
  class PageVM extends ViewModelBase<{}> {
    protected willMount() { return pending; }
  }
  const Page = withViewModel(PageVM, () => 'Ready', {
    fallback: () => 'VM loading',
  });
  const tree = () => createComponent(Suspense, {
    fallback: 'Suspense loading',
    get children() { return createComponent(Page, {}); },
  });
  const previousMode = viewModelsConfig.mode;
  viewModelsConfig.mode = 'ssr';
  return {
    tree,
    resolveMount,
    restore: () => { viewModelsConfig.mode = previousMode; },
  };
};

test('Solid Suspense renders a fallback for an async VM in renderToString', async () => {
  const { renderToString } = await import('solid-js/web');
  const fixture = await createAsyncSsrFixture();
  try {
    const html = renderToString(fixture.tree);
    expect(html).toContain('Suspense loading');
  } finally {
    fixture.resolveMount();
    fixture.restore();
  }
});

test('Solid Suspense waits for an async VM in renderToStringAsync', async () => {
  const { renderToStringAsync } = await import('solid-js/web');
  const fixture = await createAsyncSsrFixture();
  try {
    queueMicrotask(fixture.resolveMount);
    const html = await renderToStringAsync(fixture.tree, { timeoutMs: 1000 });
    expect(html).toContain('Ready');
  } finally {
    fixture.resolveMount();
    fixture.restore();
  }
});

test('retries a no-store async VM without constructing or mounting it twice', async () => {
  const { ViewModelBase, viewModelsConfig } = await import('mobx-view-model');
  const { Suspense } = await import('solid-js');
  const { renderToStringAsync } = await import('solid-js/web');
  const { withViewModel } = await import('../index.js');

  let resolveMount!: () => void;
  const pending = new Promise<void>((resolve) => { resolveMount = resolve; });
  let constructed = 0;
  let mounted = 0;
  let unmounted = 0;
  class PageVM extends ViewModelBase<{}> {
    constructor(params: ConstructorParameters<typeof ViewModelBase<{}>>[0]) {
      super(params);
      constructed++;
    }

    protected willMount() {
      mounted++;
      return pending;
    }

    unmount() {
      unmounted++;
      super.unmount();
    }
  }
  const Page = withViewModel(PageVM, ({ model }) => (
    <span data-testid="view">{model.vm.state}</span>
  ));
  const previousMode = viewModelsConfig.mode;
  try {
    viewModelsConfig.mode = 'ssr';
    queueMicrotask(resolveMount);
    const html = await renderToStringAsync(() => (
      <Suspense fallback="Loading"><Page /></Suspense>
    ), { timeoutMs: 1000 });
    expect(html).toContain('mounted');
    expect(constructed).toBe(1);
    expect(mounted).toBe(1);
    expect(unmounted).toBe(1);
  } finally {
    resolveMount();
    viewModelsConfig.mode = previousMode;
  }
});

test('keeps a store-backed VM through SSR retries and cleans it up afterward', async () => {
  const { ViewModelBase, ViewModelStoreBase, viewModelsConfig } =
    await import('mobx-view-model');
  const { Suspense } = await import('solid-js');
  const { renderToStringAsync } = await import('solid-js/web');
  const { ViewModelsProvider, withViewModel } = await import('../index.js');

  const store = new ViewModelStoreBase({});
  let resolveMount!: () => void;
  const pending = new Promise<void>((resolve) => { resolveMount = resolve; });
  let mounts = 0;
  let unmounts = 0;
  class PageVM extends ViewModelBase<{}> {
    protected willMount() {
      mounts++;
      return pending;
    }

    unmount() {
      unmounts++;
      super.unmount();
    }
  }
  const Page = withViewModel(PageVM, ({ model }) => (
    <span data-testid="view">{model.id}</span>
  ), { id: 'stored-page' });
  const previousMode = viewModelsConfig.mode;
  try {
    viewModelsConfig.mode = 'ssr';
    queueMicrotask(resolveMount);
    const html = await renderToStringAsync(() => (
      <ViewModelsProvider value={store}>
        <Suspense fallback="Loading"><Page /></Suspense>
      </ViewModelsProvider>
    ), { timeoutMs: 1000 });

    expect(html).toContain('stored-page');
    expect(mounts).toBe(1);
    expect(unmounts).toBe(1);
    expect(store.get('stored-page')).toBeNull();
  } finally {
    resolveMount();
    viewModelsConfig.mode = previousMode;
  }
});

test('reuses global resource data across async SSR retries', async () => {
  const { ViewModelBase, viewModelsConfig } = await import('mobx-view-model');
  const { Suspense } = await import('solid-js');
  const { renderToStringAsync } = await import('solid-js/web');
  const { withViewModel } = await import('../index.js');

  let resolveMount!: () => void;
  const pending = new Promise<void>((resolve) => { resolveMount = resolve; });
  const resource = {
    read: vi.fn((id: string) => ({ id, value: 'resource-ready' })),
  };
  class ResourceVM extends ViewModelBase<{}> {
    protected willMount() {
      return pending;
    }
  }
  const Page = withViewModel(ResourceVM, ({ model }) => (
    <span>{(model.vm.data as { value: string }).value}</span>
  ));
  const previousMode = viewModelsConfig.mode;
  const previousResource = viewModelsConfig.resource;

  try {
    viewModelsConfig.mode = 'ssr';
    viewModelsConfig.resource = resource;
    queueMicrotask(resolveMount);

    const html = await renderToStringAsync(
      () => <Suspense fallback="Loading"><Page /></Suspense>,
      { timeoutMs: 1000 },
    );

    expect(html).toContain('resource-ready');
    expect(resource.read).toHaveBeenCalledTimes(1);
  } finally {
    resolveMount();
    viewModelsConfig.mode = previousMode;
    viewModelsConfig.resource = previousResource;
  }
});

test('Solid Suspense waits for an async VM in renderToStream', async () => {
  const { renderToStream } = await import('solid-js/web');
  const fixture = await createAsyncSsrFixture();
  try {
    queueMicrotask(fixture.resolveMount);
    const html = await renderToStream(fixture.tree);
    expect(html).toContain('Ready');
  } finally {
    fixture.resolveMount();
    fixture.restore();
  }
});
