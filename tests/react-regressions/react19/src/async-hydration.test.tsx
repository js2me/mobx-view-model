import { _internals, ViewModelBase, viewModelsConfig } from 'mobx-view-model';
import { withViewModel } from 'mobx-view-model-react';
import { act } from '@testing-library/react';
import { Suspense } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { renderToReadableStream, renderToString } from 'react-dom/server';
import { expect, test, vi } from 'vitest';

test('hydrates completed async SSR content while client mount is still pending', async () => {
  const previousMode = viewModelsConfig.mode;
  const previousIsClient = _internals.isClient;
  let resolveServer!: () => void;
  let resolveClient!: () => void;
  const serverGate = new Promise<void>((resolve) => { resolveServer = resolve; });
  const clientGate = new Promise<void>((resolve) => { resolveClient = resolve; });
  let serverReady = false;
  let serverMounts = 0;
  let clientMounts = 0;

  class PageVM extends ViewModelBase<{}> {
    protected willMount() {
      if (!_internals.isClient) {
        serverMounts++;
        return serverReady ? undefined : serverGate;
      }
      clientMounts++;
      return clientGate;
    }
  }

  const Page = withViewModel(PageVM, () => <span data-testid="view">Ready</span>);
  const tree = (
    <Suspense fallback={<span data-testid="loading">Loading</span>}>
      <Page />
    </Suspense>
  );

  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  let root: ReturnType<typeof hydrateRoot> | undefined;
  try {
    viewModelsConfig.mode = 'ssr';
    _internals.isClient = false;
    vi.stubGlobal('window', undefined);

    const stream = await renderToReadableStream(tree);
    reader = stream.getReader();
    const decoder = new TextDecoder();
    let markup = '';
    expect(serverReady).toBe(false);
    expect(serverMounts).toBeGreaterThan(0);
    serverReady = true;
    resolveServer();
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      markup += decoder.decode(chunk.value, { stream: true });
    }
    markup += decoder.decode();
    expect(markup).toContain('data-testid="view"');
    expect(markup).not.toContain('data-testid="loading"');

    vi.unstubAllGlobals();
    _internals.isClient = previousIsClient;
    const container = document.createElement('div');
    container.innerHTML = markup;
    const recoverableErrors: unknown[] = [];
    await act(async () => {
      root = hydrateRoot(container, tree, {
        onRecoverableError: (error) => recoverableErrors.push(error),
      });
    });
    expect(clientMounts).toBeGreaterThan(0);
    expect(recoverableErrors).toEqual([]);

    await act(async () => { resolveClient(); });
    expect(container.querySelector('[data-testid="view"]')?.textContent).toBe('Ready');
    expect(recoverableErrors).toEqual([]);
  } finally {
    serverReady = true;
    resolveServer();
    resolveClient();
    await act(async () => root?.unmount());
    await reader?.cancel();
    vi.unstubAllGlobals();
    _internals.isClient = previousIsClient;
    viewModelsConfig.mode = previousMode;
  }
});

test('renderToString fallback recovers by client rendering the async boundary', async () => {
  const previousMode = viewModelsConfig.mode;
  const previousIsClient = _internals.isClient;
  const pendingMounts: Array<() => void> = [];
  class PageVM extends ViewModelBase<{}> {
    protected willMount() {
      return new Promise<void>((resolve) => pendingMounts.push(resolve));
    }
  }
  const Page = withViewModel(PageVM, () => <span data-testid="view">Ready</span>);
  const tree = (
    <Suspense fallback={<span data-testid="loading">Loading</span>}>
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
    expect(html).toContain('data-testid="loading"');
    expect(html).not.toContain('data-testid="view"');

    const container = document.createElement('div');
    container.innerHTML = html;
    const recoverableErrors: unknown[] = [];
    await act(async () => {
      root = hydrateRoot(container, tree, {
        onRecoverableError: (error) => recoverableErrors.push(error),
      });
    });
    // This is a renderToString limitation, not evidence of an HOC mismatch.
    expect(recoverableErrors.map(String).join('\n')).toMatch(/renderToString.*Suspense/i);
    expect(pendingMounts.length).toBeGreaterThan(1);
  } finally {
    await act(async () => root?.unmount());
    for (const resolve of pendingMounts) resolve();
    viewModelsConfig.mode = previousMode;
    _internals.isClient = previousIsClient;
    vi.unstubAllGlobals();
  }
});
