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
import { afterEach, describe, expect, test } from 'vitest';
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

describe('staged commit (client + staging-capable store)', () => {
  test('VM is visible to lookups during render via read-through, committed after', async () => {
    const vmStore = new ViewModelStoreBaseMock();

    class FooVM extends ViewModelBaseMock {}

    const probes: {
      hasDuringRender?: boolean;
      mountedCountDuringRender?: number;
    } = {};

    const Component = () => {
      const vm = useCreateViewModel(FooVM, undefined, { id: 'foo' });

      // Read during the render phase: the VM is staged — visible to
      // read-through lookups, but not a committed store member yet.
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

    // render-phase reads work (siblings / VM computeds can find the VM)
    expect(probes.hasDuringRender).toBe(true);
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
});
