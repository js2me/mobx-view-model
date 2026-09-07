/**
 * @vitest-environment jsdom
 */
import { makeObservable, observable, action } from 'mobx';
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
import { afterEach, describe, expect, test, vi } from 'vitest';
import { Suspense, lazy, type ComponentType } from 'react';

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

afterEach(() => {
  cleanup();
});

describe('render-phase VM staging', () => {
  test('VM is registered only after its fiber commits', async () => {
    const vmStore = new ViewModelStoreBaseMock();

    class FooVM extends ViewModelBaseMock {}

    const probes: {
      hasDuringRender?: boolean;
      mountedCountDuringRender?: number;
    } = {};

    const Component = () => {
      const vm = useCreateViewModel(FooVM, undefined, { id: 'foo' });

      // Direct core-store lookups do not see React's render-phase registry.
      probes.hasDuringRender = vmStore.has(FooVM);
      probes.mountedCountDuringRender = vmStore.mountedViewsCount;

      return <span data-testid="foo">{vm.id}</span>;
    };

    await act(async () =>
      render(
        <ViewModelsProvider value={vmStore}>
          <Component />
        </ViewModelsProvider>,
      ),
    );

    expect(probes.hasDuringRender).toBe(false);
    // ...but the VM was not counted as a committed store member in render
    expect(probes.mountedCountDuringRender).toBe(0);

    // after the commit effect: promoted + mounted
    expect(vmStore.get(FooVM)).toBeDefined();
    expect(vmStore.getIds(FooVM)).toEqual(['foo']);
    expect(vmStore.mountedViewsCount).toBe(1);
  });

  test('discarded fiber never leaves a committed mounting VM behind', async () => {
    const vmStore = new ViewModelStoreBaseMock();
    const routeStore = new RouteStore();
    const mountLog: string[] = [];

    class LayoutVM extends ViewModelBaseMock {}
    class PageVM extends ViewModelBaseMock {
      mount() {
        mountLog.push(`PageVM:${this.id}`);
        return super.mount();
      }
    }

    let pageRenderCount = 0;

    let resolveChild!: (module: { default: ComponentType }) => void;
    const LazyChild = lazy(
      () =>
        new Promise<{ default: ComponentType }>((resolve) => {
          resolveChild = resolve;
        }),
    );

    // Page with a lazy child WITHOUT its own Suspense — the child's suspend
    // propagates to the Routing Suspense and React 19 discards one of the
    // two page fibers created in the same render pass.
    const PageView = ({ model }: { model: InstanceType<typeof PageVM> }) => {
      pageRenderCount += 1;
      if (pageRenderCount > 100) {
        throw new Error(
          'Suspense retry loop detected: PageView rendered more than 100 times',
        );
      }

      return (
        <div data-testid="page">
          <span>{model.id}</span>
          <LazyChild />
        </div>
      );
    };
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

    await act(async () => {
      routeStore.navigate('page');
    });

    await act(async () => {
      resolvePage({ default: PageComponent });
    });

    await act(async () => {});

    await act(async () => {
      resolveChild({ default: () => <span data-testid="child">child</span> });
    });

    // Before flushing any timers: the discarded fiber's VM never entered the
    // committed store, so no committed VM sits in the "mounting" state.
    // (With the previous eager registration the orphaned VM stayed committed
    // and unmounted until the orphan-cleanup timer fired.)
    expect(vmStore.hasMountingVms).toBe(false);

    // Flush the staged-entries sweep
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    // The sweep dropped the discarded fiber's staged entry; exactly one
    // PageVM remains, and it is mounted.
    expect(vmStore.getIds(PageVM)).toHaveLength(1);
    expect(vmStore.getIds(LayoutVM)).toHaveLength(1);
    expect(vmStore.mountedViewsCount).toBe(2);
    expect(screen.getByTestId('page')).toBeDefined();

    const pageMounts = mountLog.filter((l) => l.startsWith('PageVM'));
    expect(pageMounts.length).toBeGreaterThanOrEqual(1);
  });

  test('does not revive a detached VM from a render that suspends', async () => {
    const vmStore = new ViewModelStoreBaseMock();
    const mountSpy = vi.fn();
    let suspend = false;
    const never = new Promise<void>(() => {});

    class FooVM extends ViewModelBaseMock {
      mount() {
        mountSpy();
        return super.mount();
      }
    }

    const Component = () => {
      const vm = useCreateViewModel(FooVM, undefined, { id: 'foo' });
      if (suspend) throw never;
      return <span>{vm.id}</span>;
    };

    const App = () => (
      <ViewModelsProvider value={vmStore}>
        <Suspense fallback={<span data-testid="loading">Loading</span>}>
          <Component />
        </Suspense>
      </ViewModelsProvider>
    );

    const view = await act(async () => render(<App />));
    const vm = vmStore.get<FooVM>('foo')!;
    // Simulate the cleanup React performed when this persisted fiber was
    // hidden before it started a new render.
    vmStore.unmount(vm);
    const define = vi.spyOn(vmStore, 'define');
    mountSpy.mockClear();

    suspend = true;
    await act(async () => {
      view.rerender(<App />);
    });

    expect(define).not.toHaveBeenCalled();
    expect(mountSpy).not.toHaveBeenCalled();
    expect(vmStore.get('foo')).toBeNull();
  });
});
