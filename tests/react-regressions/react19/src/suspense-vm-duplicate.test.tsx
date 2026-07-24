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
    super({
    });
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

describe('Suspense VM duplicate prevention', () => {
  test('React.lazy + Suspense + observer + useId does not create duplicate VMs', async () => {
    const vmStore = new ViewModelStoreBaseMock();
    const routeStore = new RouteStore();

    class LayoutVM extends ViewModelBaseMock {}
    class PageVM extends ViewModelBaseMock {}

    const PageComponent = observer(() => {
      const vm = useCreateViewModel(PageVM, {}, { id: 'page-vm' });
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
    expect(vmStore.getIds(PageVM)).toHaveLength(0);

    await act(async () => {
      resolveModule({ default: PageComponent });
    });

    expect(vmStore.getIds(LayoutVM)).toHaveLength(1);
    expect(vmStore.getIds(PageVM)).toHaveLength(1);

    expect(screen.getByTestId('page')).toBeDefined();
    expect(screen.queryByTestId('loading')).toBeNull();
  });

  /**
   * Reproduces the REAL infinite-loop bug from githome:
   * React 19 + lazy + Suspense + withViewModel(observer) + useId: true
   *
   * In the real app, the cycle is driven by observer components that read
   * MobX observables which are mutated by define()/unmountNew(). The full cycle:
   * 1. RouteView (observer) reads route.isOpened → re-renders when route changes
   * 2. It renders RepositoryPage via React.lazy inside Suspense
   * 3. withViewModel(observer) creates RepositoryPageVM → define()/unmountNew() mutates MobX
   *    observables in the store (viewModelIdsByClasses, instanceAttachedCount, etc.)
   * 4. These MobX mutations trigger the observer RouteViewGroup/RouteView to re-render
   * 5. React 19 re-evaluates the Suspense boundary → remounts the component
   * 6. New useId() → new VM id → new VM created → back to step 3
   * 7. Infinite loop: 44+ duplicate RepositoryPageVM instances
   */
  test('withViewModel + observer + Suspense + useId does not create duplicate VMs', async () => {
    const vmStore = new ViewModelStoreBaseMock();
    const routeStore = new RouteStore();

    class LayoutVM extends ViewModelBaseMock {}
    class PageVM extends ViewModelBaseMock {}

    // The page component uses withViewModel — just like githome's RepositoryPage.
    // withViewModel wraps the component in observer, which tracks MobX reads.
    const PageView = ({ model }: { model: InstanceType<typeof PageVM> }) => {
      return <span data-testid="page">{model.id}</span>;
    };
    const PageComponent = withViewModel(PageVM, PageView);

    // Simulate React.lazy: component not available immediately
    let resolveModule!: (module: { default: ComponentType }) => void;
    const LazyPage = lazy(
      () =>
        new Promise<{ default: ComponentType }>((resolve) => {
          resolveModule = resolve;
        }),
    );

    // RouteView: observer that conditionally renders the lazy page
    // based on a MobX observable — same pattern as mobx-route's RouteView
    const RouteView = observer(() => {
      if (routeStore.currentRoute !== 'page') return null;
      return <LazyPage />;
    });

    // LayoutComponent: observer with its own VM, provides parent context
    // — same pattern as githome's Layout
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
    expect(vmStore.getIds(PageVM)).toHaveLength(0);

    await act(async () => {
      resolveModule({ default: PageComponent });
    });

    expect(vmStore.getIds(LayoutVM)).toHaveLength(1);
    expect(vmStore.getIds(PageVM)).toHaveLength(1);

    expect(screen.getByTestId('page')).toBeDefined();
    expect(screen.queryByTestId('loading')).toBeNull();
  });
});
