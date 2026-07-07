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
   * Regression test for React.lazy + Suspense with useReactIds: true.
   * In React 18, useId() is stable across Suspense retries, so no duplicates.
   */
  test('React.lazy + Suspense + observer + useReactIds does not create duplicate VMs', async () => {
    const vmStore = new ViewModelStoreBaseMock();
    const routeStore = new RouteStore();

    class LayoutVM extends ViewModelBaseMock {}
    class PageVM extends ViewModelBaseMock {}

    const PageComponent = observer(() => {
      const vm = useCreateViewModel(PageVM);
      return <span data-testid="page">{vm.id}</span>;
    });

    let resolveModule!: (module: { default: ComponentType }) => void;
    const LazyPage = lazy(
      () =>
        new Promise<{ default: ComponentType }>((resolve) => {
          resolveModule = resolve;
        }),
    );

    const RouteView = observer(() => {
      if (routeStore.currentRoute !== 'page') return null;
      return <LazyPage />;
    });

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

    expect(vmStore.getIds(LayoutVM)).toHaveLength(1);
    expect(vmStore.getIds(PageVM)).toHaveLength(0);

    await act(async () => {
      routeStore.navigate('page');
    });

    expect(screen.getByTestId('loading')).toBeDefined();

    await act(async () => {
      resolveModule({ default: PageComponent });
    });

    expect(vmStore.getIds(LayoutVM)).toHaveLength(1);
    expect(vmStore.getIds(PageVM)).toHaveLength(1);

    expect(screen.getByTestId('page')).toBeDefined();
    expect(screen.queryByTestId('loading')).toBeNull();
  });
});
