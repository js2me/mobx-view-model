/**
 * Hydration mismatch behavior documentation test.
 *
 * Known behavior: when React abandons a hydration fiber (due to mismatch
 * between SSR HTML and client observer render), a new fiber with a new
 * useId is created → new VM id → ctx data keyed by old SSR id becomes
 * unreachable → ctx=null.
 *
 * RECOMMENDED FIX: prevent the mismatch at the application level.
 * Render static content that matches between SSR and client, add
 * dynamic content only after hydration. Use explicit VM ids for SSR.
 *
 * This test documents the CURRENT behavior, not a future fix.
 * Library-level reclaim was considered but deemed overhead.
 */
import { act } from '@testing-library/react';
import { makeObservable, observable, runInAction } from 'mobx';
import type { ReactNode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ViewModelBase, viewModelsConfig } from 'mobx-view-model';
import { ViewModelStoreBaseMock } from '../../../core/src/view-model/view-model.store.base.test.js';
import { ViewModelsProvider } from '../components/index.js';
import { type ViewModelProps, withViewModel } from '../hoc/with-view-model.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

/**
 * VM that loads ctx from loadedContexts keyed by VM id.
 * Pattern from gozon's NotFoundPageVM:
 * - constructor reads ctx from loadedContexts[this.id]
 * - willMount() sets ctx on SSR (server branch)
 * - mount() saves ctx back to loadedContexts for serialization
 */
class HydrationMismatchPageVM extends ViewModelBase<{}> {
  @observable.ref ctx: { label: string } | null = null;

  constructor(params: any) {
    super(params);
    // ctx loaded from loadedContexts keyed by VM id — gozon production pattern
    this.ctx = params?.viewModels?.loadedContexts?.[this.id ?? ''] ?? null;
    makeObservable(this);
  }

  willMount() {
    if (typeof window === 'undefined') {
      // SSR branch: set ctx from server data
      runInAction(() => {
        this.ctx = { label: `ssr-${this.id}` };
      });
    }
    // Client branch: ctx loaded from loadedContexts in constructor
  }

  mount() {
    const result = super.mount();
    // Save ctx back to loadedContexts for serialization
    if (this.id && this.viewModels) {
      (this.viewModels as any).loadedContexts[this.id] = this.ctx;
    }
    return result;
  }
}

/** Dynamic observable to force hydration mismatch between SSR and client */
const createTick$ = () => observable.box(0);

const createDynamicView = (tick$: ReturnType<typeof createTick$>) =>
  ({ model }: ViewModelProps<HydrationMismatchPageVM>) => (
    <div>
      <span data-testid="ctx-label">{model.ctx?.label ?? 'NO_CTX'}</span>
      <span data-testid="vm-id">{model.id}</span>
      <span data-testid="tick">{tick$.get()}</span>
    </div>
  );

const renderOnServer = (node: ReactNode) => {
  vi.stubGlobal('window', undefined);
  try {
    return renderToString(<>{node}</>);
  } finally {
    vi.unstubAllGlobals();
  }
};

describe('hydration mismatch', () => {
  /**
   * Documents: auto-id VM loses ctx data when React creates a new fiber
   * (simulated via createRoot after SSR render).
   *
   * Root cause: useId changes between SSR (_R_0_) and client (_r_0_)
   * → VM id changes → loadedContexts keyed by new id is null → ctx=null.
   *
   * Recommended fix: prevent mismatch at application level
   * (static content first, dynamic after hydration).
   */
  it('auto-generated VM id: ctx data is lost when React creates new fiber (createRoot simulation)', async () => {
    const originalMode = viewModelsConfig.mode;
    viewModelsConfig.mode = 'ssr';

    const tick$ = createTick$();
    const DynamicView = createDynamicView(tick$);

    const vmStore = new ViewModelStoreBaseMock() as ViewModelStoreBaseMock & {
      loadedContexts: Record<string, any>;
    };
    (vmStore as any).loadedContexts = {};

    const Component = withViewModel(HydrationMismatchPageVM, DynamicView, {
      fallback: () => <span>loading</span>,
    });

    const App = ({ children }: { children?: ReactNode }) => (
      <ViewModelsProvider value={vmStore}>{children}</ViewModelsProvider>
    );

    // === Step 1: SSR render ===
    const html = renderOnServer(<App><Component /></App>);
    expect(html).toContain('ssr-');

    const ssrVmId = Object.keys((vmStore as any).loadedContexts)[0];
    expect(ssrVmId).toContain('HydrationMismatchPageVM');
    expect((vmStore as any).loadedContexts[ssrVmId]).toEqual({
      label: `ssr-${ssrVmId}`,
    });

    // === Step 2: Client-only render (createRoot) ===
    // Simulates React abandoning hydration fiber and re-rendering from scratch.
    // New fiber → new useId → new VM id → ctx=null

    const clientContainer = document.createElement('div');
    let root: any = null;
    try {
      await act(async () => {
        root = createRoot(clientContainer);
        root.render(<App><Component /></App>);
      });

      // === CURRENT BEHAVIOR ===
      // Client VM has different id from SSR VM (useId changed)
      const clientVmId = clientContainer.querySelector('[data-testid="vm-id"]')?.textContent ?? '';
      expect(clientVmId).not.toBe(ssrVmId);

      // loadedContexts keyed by client VM id is null (mount saves ctx=null back)
      expect((vmStore as any).loadedContexts[clientVmId]).toBeNull();

      // ctx is null → component shows 'NO_CTX' instead of SSR label
      expect(clientContainer.textContent).toContain('NO_CTX');
    } finally {
      viewModelsConfig.mode = originalMode;
      await act(async () => { root?.unmount(); });
    }
  });

  /**
   * Documents: auto-id VM loses ctx data when hydrateRoot encounters
   * a text mismatch (dynamic MobX observable differs between SSR and client).
   *
   * React 19 in jsdom recreates the subtree on text mismatch,
   * changing useId from _R_0_ (server) to _r_1_ (client re-render).
   *
   * Recommended fix: prevent mismatch at application level
   * (static content first, dynamic after hydration).
   */
  it('auto-generated VM id: ctx data is lost on hydration mismatch with dynamic content', async () => {
    const originalMode = viewModelsConfig.mode;
    viewModelsConfig.mode = 'ssr';

    const tick$ = createTick$();
    const DynamicView = createDynamicView(tick$);

    const vmStore = new ViewModelStoreBaseMock() as ViewModelStoreBaseMock & {
      loadedContexts: Record<string, any>;
    };
    (vmStore as any).loadedContexts = {};

    const Component = withViewModel(HydrationMismatchPageVM, DynamicView, {
      fallback: () => <span>loading</span>,
    });

    const App = ({ children }: { children?: ReactNode }) => (
      <ViewModelsProvider value={vmStore}>{children}</ViewModelsProvider>
    );

    // === Step 1: SSR render (tick$ = 0) ===
    const html = renderOnServer(<App><Component /></App>);
    expect(html).toContain('ssr-');

    const ssrVmId = Object.keys((vmStore as any).loadedContexts)[0];
    expect(ssrVmId).toContain('HydrationMismatchPageVM');

    // === Step 2: Client hydration with mismatch trigger ===
    // Change tick$ before hydration → observer renders different content
    // than SSR HTML → hydration mismatch
    runInAction(() => tick$.set(1));

    const container = document.createElement('div');
    container.innerHTML = html;

    // Capture hydration mismatch errors (React 19 recoverable errors)
    const hydrationErrors: any[] = [];
    const onRecoverableError = (error: any) => {
      hydrationErrors.push(error);
    };

    let root: any = null;
    try {
      await act(async () => {
        root = hydrateRoot(container, <App><Component /></App>, {
          onRecoverableError,
        });
      });

      // React detected a hydration mismatch (tick: 0 vs 1)
      expect(hydrationErrors.length).toBeGreaterThan(0);

      // === CURRENT BEHAVIOR ===
      // Hydration mismatch → React recreates subtree → new useId
      // → new VM id → ctx=null → 'NO_CTX'
      expect(container.textContent).toContain('NO_CTX');
    } finally {
      viewModelsConfig.mode = originalMode;
      await act(async () => { root?.unmount(); });
    }
  });

  /**
   * Documents: explicit VM id preserves ctx data regardless of fiber changes.
   *
   * When VM has explicit id, the id is stable across renders.
   * Even if React creates a new fiber (new useId), the VM id doesn't
   * change → loadedContexts[explicitId] remains accessible → ctx survives.
   *
   * This is the recommended approach for SSR scenarios where VMs
   * need stable ids to preserve ctx data across hydration.
   */
  it('explicit VM id: ctx data survives regardless of fiber changes', async () => {
    const originalMode = viewModelsConfig.mode;
    viewModelsConfig.mode = 'ssr';

    const tick$ = createTick$();
    const DynamicView = createDynamicView(tick$);

    const vmStore = new ViewModelStoreBaseMock() as ViewModelStoreBaseMock & {
      loadedContexts: Record<string, any>;
    };
    (vmStore as any).loadedContexts = {};

    const Component = withViewModel(HydrationMismatchPageVM, DynamicView, {
      id: 'explicit-hydration-id',
      fallback: () => <span>loading</span>,
    });

    const App = ({ children }: { children?: ReactNode }) => (
      <ViewModelsProvider value={vmStore}>{children}</ViewModelsProvider>
    );

    // === Step 1: SSR render ===
    const html = renderOnServer(<App><Component /></App>);
    expect(html).toContain('ssr-explicit-hydration-id');
    expect((vmStore as any).loadedContexts['explicit-hydration-id']).toEqual({
      label: 'ssr-explicit-hydration-id',
    });

    // === Step 2: Client-only render (createRoot) ===
    const clientContainer = document.createElement('div');
    let root: any = null;
    try {
      await act(async () => {
        root = createRoot(clientContainer);
        root.render(<App><Component /></App>);
      });

      // Explicit id: store.define returns existing VM → ctx preserved
      expect(clientContainer.textContent).toContain('ssr-explicit-hydration-id');
      expect(clientContainer.textContent).not.toContain('NO_CTX');
    } finally {
      viewModelsConfig.mode = originalMode;
      await act(async () => { root?.unmount(); });
    }
  });
});
