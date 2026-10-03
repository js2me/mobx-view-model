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
    createElement('span', null, model.vm.state),
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

test('renders the HOC fallback for an async VM in a real server module', async () => {
  const { _internals, ViewModelBase, viewModelsConfig } =
    await import('mobx-view-model');
  const { createElement } = await import('react');
  const { renderToString } = await import('react-dom/server');
  const { withViewModel } = await import('mobx-view-model-react');

  expect(_internals.isClient).toBe(false);
  let finishMount!: () => void;
  class PageVM extends ViewModelBase<{}> {
    protected willMount() {
      return new Promise<void>((resolve) => { finishMount = resolve; });
    }
  }
  const Page = withViewModel(
    PageVM,
    () => createElement('span', null, 'Ready'),
    { fallback: () => createElement('span', null, 'Loading') },
  );
  const previousMode = viewModelsConfig.mode;
  try {
    viewModelsConfig.mode = 'ssr';
    expect(renderToString(createElement(Page))).toContain('Loading');
  } finally {
    finishMount?.();
    viewModelsConfig.mode = previousMode;
  }
});
