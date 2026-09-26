/**
 * @vitest-environment node
 */
import { expect, test } from 'vitest';

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
    <span data-testid="view">{model.lifecycleState}</span>
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
