/**
 * @vitest-environment node
 */
import { expect, test } from 'vitest';

test('imports the React bindings without window and mounts during server render', async () => {
  expect(typeof window).toBe('undefined');

  const { _internals, ViewModelBase, viewModelsConfig } =
    await import('mobx-view-model');
  expect(_internals.isClient).toBe(false);

  const { createElement } = await import('react');
  const { renderToString } = await import('react-dom/server');
  const { withViewModel } = await import('mobx-view-model-react');

  let mountCount = 0;
  class PageVM extends ViewModelBase<{}> {
    protected willMount() {
      mountCount++;
    }
  }

  const Page = withViewModel(PageVM, ({ model }) =>
    createElement('span', null, model.lifecycleState),
  );
  const previousMode = viewModelsConfig.mode;
  try {
    viewModelsConfig.mode = 'ssr';
    expect(renderToString(createElement(Page))).toContain('mounted');
    expect(mountCount).toBe(1);
    expect(_internals.isClient).toBe(false);
  } finally {
    viewModelsConfig.mode = previousMode;
  }
});

test('streams a VM whose mount suspends after a real server module import', async () => {
  const { _internals, ViewModelBase, ViewModelStoreBase, viewModelsConfig } =
    await import('mobx-view-model');
  const { createElement, Suspense } = await import('react');
  const { renderToReadableStream } = await import('react-dom/server');
  const { ViewModelsProvider, withViewModel } = await import('mobx-view-model-react');

  expect(_internals.isClient).toBe(false);
  let finishMount!: () => void;
  let ready = false;
  let mounts = 0;
  const gate = new Promise<void>((resolve) => { finishMount = resolve; });
  class PageVM extends ViewModelBase<{}> {
    protected willMount() {
      mounts++;
      return ready ? undefined : gate;
    }
  }

  const store = new ViewModelStoreBase({});
  const Page = withViewModel(PageVM, () => createElement('span', null, 'Ready'));
  const tree = createElement(
    ViewModelsProvider,
    { value: store },
    createElement(Suspense, { fallback: 'Loading' }, createElement(Page)),
  );
  const previousMode = viewModelsConfig.mode;
  try {
    viewModelsConfig.mode = 'ssr';
    const stream = await renderToReadableStream(tree);
    expect(mounts).toBeGreaterThan(0);
    ready = true;
    finishMount();
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let html = '';
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      html += decoder.decode(chunk.value, { stream: true });
    }
    html += decoder.decode();
    expect(html).toContain('Ready');
    expect(html).not.toContain('Loading');
  } finally {
    ready = true;
    finishMount();
    viewModelsConfig.mode = previousMode;
  }
});
