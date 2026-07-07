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
} from 'mobx-view-model-react';
import { act, render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
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
    super({
      vmConfig: { useReactIds: true },
    });
  }

  get _instanceAttachedCount() {
    return this.instanceAttachedCount;
  }
}

/**
 * Simulates the router's RouteView pattern from githome:
 * an observer component that conditionally renders a view based on
 * a MobX observable route state.
 */
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

describe('Suspense VM duplicate prevention', () => {
  test('reuses existing VM of same class with same parent when Suspense discards render', async () => {
    const vmStore = new ViewModelStoreBaseMock();

    class ParentVM extends ViewModelBaseMock {}
    class ChildVM extends ViewModelBaseMock<Record<string, never>, ParentVM> {}

    const parentVm = new ParentVM({ id: 'parent', viewModels: vmStore });
    await vmStore.attach(parentVm);

    const orphanChild = new ChildVM({
      id: 'orphan-child',
      parentViewModel: parentVm,
      viewModels: vmStore,
    });
    await vmStore.attach(orphanChild);

    expect(vmStore.getIds(ChildVM)).toHaveLength(1);

    const ChildComponent = () => {
      const vm = useCreateViewModel(ChildVM);
      return <span data-testid="child">{vm.id}</span>;
    };

    const { unmount } = await act(async () =>
      render(
        <ViewModelsProvider value={vmStore}>
          <ActiveViewModelProvider value={parentVm}>
            <ChildComponent />
          </ActiveViewModelProvider>
        </ViewModelsProvider>,
      ),
    );

    expect(vmStore.getIds(ChildVM)).toHaveLength(1);
    expect(vmStore.get(ChildVM)).toBe(orphanChild);

    await act(async () => {
      unmount();
    });

    expect(vmStore.get(orphanChild.id)).toBeNull();
  });

  test('balances instanceAttachedCount when reusing orphan VM from discarded render', async () => {
    const vmStore = new ViewModelStoreBaseMock();

    class ParentVM extends ViewModelBaseMock {}
    class ChildVM extends ViewModelBaseMock<Record<string, never>, ParentVM> {}

    const parentVm = new ParentVM({ id: 'parent', viewModels: vmStore });
    await vmStore.attach(parentVm);

    const orphanChild = new ChildVM({
      id: 'orphan-child',
      parentViewModel: parentVm,
      viewModels: vmStore,
    });
    await vmStore.attach(orphanChild);

    expect(vmStore._instanceAttachedCount.get(orphanChild.id)).toBe(1);

    const ChildComponent = () => {
      const vm = useCreateViewModel(ChildVM);
      return <span data-testid="child">{vm.id}</span>;
    };

    const { unmount } = await act(async () =>
      render(
        <ViewModelsProvider value={vmStore}>
          <ActiveViewModelProvider value={parentVm}>
            <ChildComponent />
          </ActiveViewModelProvider>
        </ViewModelsProvider>,
      ),
    );

    expect(vmStore._instanceAttachedCount.get(orphanChild.id)).toBe(1);

    await act(async () => {
      unmount();
    });

    expect(vmStore._instanceAttachedCount.get(orphanChild.id)).toBeUndefined();
    expect(vmStore.get(orphanChild.id)).toBeNull();
  });

  /**
   * Reproduces the real infinite-loop bug from githome:
   * React 19 + lazy + Suspense + observer + useReactIds: true
   *
   * In the real app, the cycle is driven by the router:
   * 1. RouteView (observer) re-renders when route observables change
   * 2. It renders RepositoryPage via React.lazy inside Suspense
   * 3. attach() mutates MobX observables → observer re-renders
   * 4. React 19 re-evaluates the Suspense boundary → remounts the component
   * 5. New useId() → new VM id → new VM created → back to step 3
   * 6. Infinite loop: 61+ duplicate RepositoryPageVM instances
   *
   * The fix: when creating a new VM, check for an existing uncommitted VM
   * of the same class with the same parent and reuse it.
   */
  test('React.lazy + Suspense + observer + useReactIds does not create duplicate VMs', async () => {
    const vmStore = new ViewModelStoreBaseMock();
    const routeStore = new RouteStore();

    class LayoutVM extends ViewModelBaseMock {}
    class PageVM extends ViewModelBaseMock {}

    // PageComponent wrapped in observer — just like withViewModel does
    const PageComponent = observer(() => {
      const vm = useCreateViewModel(PageVM);
      return <span data-testid="page">{vm.id}</span>;
    });

    // Simulate React.lazy: component not available immediately
    let resolveModule!: (module: { default: ComponentType }) => void;
    const LazyPage = lazy(
      () =>
        new Promise<{ default: ComponentType }>((resolve) => {
          resolveModule = resolve;
        }),
    );

    // RouteView: observer that conditionally renders the lazy page
    // based on a MobX observable — same pattern as the real router
    const RouteView = observer(() => {
      if (routeStore.currentRoute !== 'page') return null;
      return <LazyPage />;
    });

    // LayoutVM is OUTSIDE the Suspense boundary — persists across retries
    const LayoutComponent = observer(() => {
      const layoutVm = useCreateViewModel(LayoutVM);
      return (
        <ActiveViewModelProvider value={layoutVm}>
          <div data-testid="layout">
            <Suspense fallback={<span data-testid="loading">Loading</span>}>
              <RouteView />
            </Suspense>
          </div>
        </ActiveViewModelProvider>
      );
    });

    await act(async () =>
      render(
        <ViewModelsProvider value={vmStore}>
          <LayoutComponent />
        </ViewModelsProvider>,
      ),
    );

    // No route active — no PageVM
    expect(vmStore.getIds(LayoutVM)).toHaveLength(1);
    expect(vmStore.getIds(PageVM)).toHaveLength(0);

    // Navigate to the page route (like clicking a link in the app)
    await act(async () => {
      routeStore.navigate('page');
    });

    // Lazy component hasn't loaded yet — fallback showing
    expect(screen.getByTestId('loading')).toBeDefined();
    expect(vmStore.getIds(PageVM)).toHaveLength(0);

    // Load the lazy module
    await act(async () => {
      resolveModule({ default: PageComponent });
    });

    // Should be exactly 1 of each VM type
    expect(vmStore.getIds(LayoutVM)).toHaveLength(1);
    expect(vmStore.getIds(PageVM)).toHaveLength(1);

    expect(screen.getByTestId('page')).toBeDefined();
    expect(screen.queryByTestId('loading')).toBeNull();
  });
});
