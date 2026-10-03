import { _internals, ViewModelBase, viewModelsConfig } from 'mobx-view-model';
import { withViewModel } from 'mobx-view-model-react';
import { act } from '@testing-library/react';
import { Suspense, type ReactNode } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { expect, test, vi } from 'vitest';

test('hydrating an async VM preserves the server fallback until mount completes', async () => {
  const previousMode = viewModelsConfig.mode;
  const previousIsClient = _internals.isClient;
  const pendingMounts: Array<() => void> = [];

  class PageVM extends ViewModelBase<{}> {
    protected willMount() {
      return new Promise<void>((resolve) => pendingMounts.push(resolve));
    }
  }

  const Page = withViewModel(PageVM, () => <span data-testid="view">Ready</span>, {
    fallback: () => <span data-testid="vm-loading">Loading</span>,
  });
  const tree: ReactNode = (
    <Suspense fallback={<span data-testid="suspense-loading">Loading</span>}>
      <Page />
    </Suspense>
  );

  let root: ReturnType<typeof hydrateRoot> | undefined;
  try {
    viewModelsConfig.mode = 'ssr';
    _internals.isClient = false;
    vi.stubGlobal('window', undefined);
    let html: string;
    try {
      html = renderToString(tree);
    } finally {
      vi.unstubAllGlobals();
      _internals.isClient = previousIsClient;
    }
    expect(html).toContain('vm-loading');
    expect(html).not.toContain('data-testid="view"');

    const container = document.createElement('div');
    container.innerHTML = html;
    const recoverableErrors: unknown[] = [];
    await act(async () => {
      root = hydrateRoot(container, tree, {
        onRecoverableError: (error) => recoverableErrors.push(error),
      });
    });

    expect(recoverableErrors).toEqual([]);
    expect(container.querySelector('[data-testid="vm-loading"]')?.textContent).toBe('Loading');
    expect(container.querySelector('[data-testid="view"]')).toBeNull();
    expect(pendingMounts.length).toBeGreaterThan(1);
    await act(async () => {
      for (const resolve of pendingMounts) resolve();
    });
    expect(container.querySelector('[data-testid="view"]')?.textContent).toBe('Ready');
    expect(recoverableErrors).toEqual([]);
  } finally {
    await act(async () => root?.unmount());
    for (const resolve of pendingMounts) resolve();
    viewModelsConfig.mode = previousMode;
    _internals.isClient = previousIsClient;
    vi.unstubAllGlobals();
  }
});
