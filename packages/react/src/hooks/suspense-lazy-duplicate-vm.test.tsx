/**
 * @vitest-environment jsdom
 */
import { makeObservable, observable, action, computed, runInAction } from 'mobx';
import { observer } from 'mobx-react-lite';
import {
  ViewModelBase,
  ViewModelStoreBase,
  type AnyViewModel,
  type AnyViewModelSimple,
  type ViewModelParams,
} from 'mobx-view-model';
import {
  ActiveViewModelProvider,
  ViewModelsProvider,
  useCreateViewModel,
  withViewModel,
} from 'mobx-view-model-react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';
import { Suspense, lazy, type ComponentType, useEffect } from 'react';

class ViewModelBaseMock<
  Payload extends Record<string, unknown> = Record<string, never>,
  ParentViewModel extends AnyViewModel | AnyViewModelSimple | null = null,
> extends ViewModelBase<Payload, ParentViewModel> {
  constructor(params?: Partial<ViewModelParams<Payload, ParentViewModel>>) {
    super({
      ...params,
      id: params?.id ?? '1',
      payload: params?.payload as Payload,
    });
    makeObservable(this);
  }
}

class ViewModelStoreBaseMock extends ViewModelStoreBase {
  constructor() {
    super({});
  }
}

class RouteStore {
  currentRoute: string | null = null;

  constructor() {
    makeObservable(this, {
      currentRoute: observable.ref,
      navigate: action,
    });
  }

  navigate(route: string) {
    this.currentRoute = route;
  }
}

class VirtualRoute {
  status: 'unknown' | 'opening' | 'opened' = 'unknown';

  get isOpened() {
    return this.status === 'opened';
  }
  get isOpening() {
    return this.status === 'opening';
  }

  constructor() {
    makeObservable(this, {
      status: observable.ref,
      isOpened: computed,
      isOpening: computed,
      open: action,
    });
  }

  async open() {
    runInAction(() => {
      this.status = 'opening';
    });
    await undefined;
    await undefined;
    runInAction(() => {
      this.status = 'opened';
    });
  }
}

afterEach(() => {
  cleanup();
});

/**
 * When a child lazy component inside a withViewModel page suspends WITHOUT
 * its own Suspense boundary, the suspend propagates to the nearest Suspense
 * above the page. React 19 then creates two fibers for the page component
 * in the same render pass, both going through useCreateViewModel separately.
 * Each fiber has its own useRef cache, so both create fresh VM instances.
 * The first fiber is discarded by React — its effect cleanup never runs —
 * so the first VM is orphaned in the store forever.
 *
 * Result: two PageVM instances with different IDs in the store.
 */
describe('Nested Suspense + lazy child suspend causes duplicate VMs', () => {
  /**
   * Two Suspense boundaries. The page is lazy and resolves.
   * Then a child component inside the page is also lazy and suspends
   * WITHOUT its own Suspense — the suspend propagates to the Routing Suspense.
   * The Routing Suspense shows fallback, unmounting the page.
   */
  test('lazy page + lazy child without own Suspense → only 1 PageVM', async () => {
    const vmStore = new ViewModelStoreBaseMock();
    const routeStore = new RouteStore();
    const mountLog: string[] = [];

    class LayoutVM extends ViewModelBaseMock {
      mount() {
        mountLog.push(`LayoutVM:${this.id}`);
        return super.mount();
      }
    }
    class PageVM extends ViewModelBaseMock {
      mount() {
        mountLog.push(`PageVM:${this.id}`);
        return super.mount();
      }
    }

    let resolveChild!: (module: { default: ComponentType }) => void;
    const LazyChild = lazy(
      () =>
        new Promise<{ default: ComponentType }>((resolve) => {
          resolveChild = resolve;
        }),
    );

    // Page with lazy child WITHOUT its own Suspense —
    // child's suspend propagates to the outer Suspense
    const PageView = ({ model }: { model: InstanceType<typeof PageVM> }) => (
      <div data-testid="page">
        <span>{model.id}</span>
        <LazyChild />
      </div>
    );
    const PageComponent = withViewModel(PageVM, PageView);

    let resolvePage!: (module: { default: ComponentType }) => void;
    const LazyPage = lazy(
      () =>
        new Promise<{ default: ComponentType }>((resolve) => {
          resolvePage = resolve;
        }),
    );

    const LayoutView = ({
      children,
      model,
    }: {
      children: React.ReactNode;
      model: InstanceType<typeof LayoutVM>;
    }) => (
      <ActiveViewModelProvider value={model}>
        <div data-testid="layout">
          <Suspense fallback={<span data-testid="loading">Loading</span>}>
            {children}
          </Suspense>
        </div>
      </ActiveViewModelProvider>
    );
    const LayoutComponent = withViewModel(LayoutVM, LayoutView);

    const RouteView = observer(() => {
      if (routeStore.currentRoute !== 'page') return null;
      return <LazyPage />;
    });

    // Inner Suspense (from routing) — catches child's suspend
    const Routing = observer(() => (
      <Suspense fallback={null}>
        <RouteView />
      </Suspense>
    ));

    await act(async () =>
      render(
        <ViewModelsProvider value={vmStore}>
          <LayoutComponent>
            <Routing />
          </LayoutComponent>
        </ViewModelsProvider>,
      ),
    );

    expect(vmStore.getIds(LayoutVM)).toHaveLength(1);
    expect(vmStore.getIds(PageVM)).toHaveLength(0);

    // Navigate to page
    await act(async () => {
      routeStore.navigate('page');
    });

    // Page is lazy → suspends → inner Suspense shows null
    expect(vmStore.getIds(PageVM)).toHaveLength(0);

    // Resolve page lazy — page mounts, but child is lazy → suspends
    // The child's suspend propagates to the inner Suspense (Routing's)
    await act(async () => {
      resolvePage({ default: PageComponent });
    });

    // Wait for deferred unmounts
    await act(async () => {});

    // Resolve child lazy
    await act(async () => {
      resolveChild({ default: () => <span data-testid="child">child</span> });
    });

    // Key check: only 1 PageVM, not 2
    expect(vmStore.getIds(PageVM)).toHaveLength(1);
    expect(vmStore.getIds(LayoutVM)).toHaveLength(1);
    expect(screen.getByTestId('page')).toBeDefined();

    // The orphaned VM's mount() was called before cleanup, so mountLog may
    // contain entries from discarded fibers. The important check is that
    // the store only has 1 PageVM (verified above).
    const pageMounts = mountLog.filter((l) => l.startsWith('PageVM'));
    expect(pageMounts.length).toBeGreaterThanOrEqual(1);
  });

  /**
   * Same pattern but with async route open (VirtualRoute).
   * The route transitions from `isOpening` to `isOpened`.
   */
  test('async route open + lazy child without own Suspense → only 1 PageVM', async () => {
    const vmStore = new ViewModelStoreBaseMock();
    const mountLog: string[] = [];

    class LayoutVM extends ViewModelBaseMock {
      mount() {
        mountLog.push(`LayoutVM:${this.id}`);
        return super.mount();
      }
    }
    class PageVM extends ViewModelBaseMock {
      mount() {
        mountLog.push(`PageVM:${this.id}`);
        return super.mount();
      }
    }

    let resolveChild!: (module: { default: ComponentType }) => void;
    const LazyChild = lazy(
      () =>
        new Promise<{ default: ComponentType }>((resolve) => {
          resolveChild = resolve;
        }),
    );

    const PageView = ({ model }: { model: InstanceType<typeof PageVM> }) => (
      <div data-testid="page">
        <span>{model.id}</span>
        <LazyChild />
      </div>
    );
    const PageComponent = withViewModel(PageVM, PageView);

    let resolvePage!: (module: { default: ComponentType }) => void;
    const LazyPage = lazy(
      () =>
        new Promise<{ default: ComponentType }>((resolve) => {
          resolvePage = resolve;
        }),
    );

    const LayoutView = ({
      children,
      model,
    }: {
      children: React.ReactNode;
      model: InstanceType<typeof LayoutVM>;
    }) => (
      <ActiveViewModelProvider value={model}>
        <div data-testid="layout">
          <Suspense fallback={<span data-testid="loading">Loading</span>}>
            {children}
          </Suspense>
        </div>
      </ActiveViewModelProvider>
    );
    const LayoutComponent = withViewModel(LayoutVM, LayoutView);

    const route = new VirtualRoute();

    const RouteViewGroupLike = observer(() => {
      const isActive = route.isOpened || route.isOpening;
      useEffect(() => {
        if (!isActive) {
          route.open();
        }
      }, [isActive]);

      if (!isActive) return null;

      return (
        <LayoutComponent>
          <Suspense fallback={null}>
            <LazyPage />
          </Suspense>
        </LayoutComponent>
      );
    });

    await act(async () =>
      render(
        <ViewModelsProvider value={vmStore}>
          <RouteViewGroupLike />
        </ViewModelsProvider>,
      ),
    );

    expect(vmStore.getIds(LayoutVM).length).toBeGreaterThanOrEqual(1);
    expect(vmStore.getIds(PageVM)).toHaveLength(0);

    // Resolve page lazy
    await act(async () => {
      resolvePage({ default: PageComponent });
    });

    // Wait for deferred unmounts
    await act(async () => {});

    // Resolve child lazy
    await act(async () => {
      resolveChild({ default: () => <span data-testid="child">child</span> });
    });

    // Key check: only 1 PageVM, not 2
    expect(vmStore.getIds(PageVM)).toHaveLength(1);
    expect(vmStore.getIds(LayoutVM)).toHaveLength(1);
    expect(screen.getByTestId('page')).toBeDefined();

    const pageMounts = mountLog.filter((l) => l.startsWith('PageVM'));
    expect(pageMounts.length).toBeGreaterThanOrEqual(1);
  });

  /**
   * When the child HAS its own Suspense, the suspend is caught locally
   * and the page is NOT unmounted. This should work correctly.
   */
  test('lazy page + lazy child WITH own Suspense → only 1 PageVM', async () => {
    const vmStore = new ViewModelStoreBaseMock();
    const routeStore = new RouteStore();
    const mountLog: string[] = [];

    class LayoutVM extends ViewModelBaseMock {
      mount() {
        mountLog.push(`LayoutVM:${this.id}`);
        return super.mount();
      }
    }
    class PageVM extends ViewModelBaseMock {
      mount() {
        mountLog.push(`PageVM:${this.id}`);
        return super.mount();
      }
    }
    class ChildVM extends ViewModelBaseMock {
      mount() {
        mountLog.push(`ChildVM:${this.id}`);
        return super.mount();
      }
    }

    const ChildView = ({ model }: { model: InstanceType<typeof ChildVM> }) => (
      <span data-testid="child">{model.id}</span>
    );
    const ChildComponent = withViewModel(ChildVM, ChildView);

    let resolveChild!: (module: { default: ComponentType }) => void;
    const LazyChild = lazy(
      () =>
        new Promise<{ default: ComponentType }>((resolve) => {
          resolveChild = resolve;
        }),
    );

    // Page with lazy child WITH its own Suspense —
    // child's suspend is caught locally, page stays mounted
    const PageView = ({ model }: { model: InstanceType<typeof PageVM> }) => (
      <div data-testid="page">
        <span>{model.id}</span>
        <Suspense fallback={<span data-testid="child-loading">Loading child</span>}>
          <LazyChild />
        </Suspense>
      </div>
    );
    const PageComponent = withViewModel(PageVM, PageView);

    let resolvePage!: (module: { default: ComponentType }) => void;
    const LazyPage = lazy(
      () =>
        new Promise<{ default: ComponentType }>((resolve) => {
          resolvePage = resolve;
        }),
    );

    const LayoutView = ({
      children,
      model,
    }: {
      children: React.ReactNode;
      model: InstanceType<typeof LayoutVM>;
    }) => (
      <ActiveViewModelProvider value={model}>
        <div data-testid="layout">
          <Suspense fallback={<span data-testid="loading">Loading</span>}>
            {children}
          </Suspense>
        </div>
      </ActiveViewModelProvider>
    );
    const LayoutComponent = withViewModel(LayoutVM, LayoutView);

    const RouteView = observer(() => {
      if (routeStore.currentRoute !== 'page') return null;
      return <LazyPage />;
    });

    const Routing = observer(() => (
      <Suspense fallback={null}>
        <RouteView />
      </Suspense>
    ));

    await act(async () =>
      render(
        <ViewModelsProvider value={vmStore}>
          <LayoutComponent>
            <Routing />
          </LayoutComponent>
        </ViewModelsProvider>,
      ),
    );

    expect(vmStore.getIds(LayoutVM)).toHaveLength(1);
    expect(vmStore.getIds(PageVM)).toHaveLength(0);

    await act(async () => {
      routeStore.navigate('page');
    });

    expect(vmStore.getIds(PageVM)).toHaveLength(0);

    await act(async () => {
      resolvePage({ default: PageComponent });
    });

    // Page rendered, child is lazy → own Suspense catches it
    expect(screen.getByTestId('page')).toBeDefined();
    expect(screen.getByTestId('child-loading')).toBeDefined();
    expect(vmStore.getIds(PageVM)).toHaveLength(1);
    expect(vmStore.getIds(ChildVM)).toHaveLength(0);

    await act(async () => {
      resolveChild({ default: ChildComponent });
    });

    expect(vmStore.getIds(PageVM)).toHaveLength(1);
    expect(vmStore.getIds(ChildVM)).toHaveLength(1);
    expect(screen.getByTestId('child')).toBeDefined();

    const pageMounts = mountLog.filter((l) => l.startsWith('PageVM'));
    expect(pageMounts).toHaveLength(1);
  });
});
