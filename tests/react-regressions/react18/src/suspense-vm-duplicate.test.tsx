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
      vmConfig: { useReactIds: true },
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
  /**
   * Regression test for React.lazy + Suspense with useReactIds: true.
   * attach() is called in the layout effect (not during render),
   * so it never triggers a MobX reaction during the render pass,
   * preventing the infinite loop.
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

  test('withViewModel + observer + Suspense + useReactIds does not create duplicate VMs', async () => {
    const vmStore = new ViewModelStoreBaseMock();
    const routeStore = new RouteStore();

    class LayoutVM extends ViewModelBaseMock {}
    class PageVM extends ViewModelBaseMock {}

    const PageView = ({ model }: { model: InstanceType<typeof PageVM> }) => {
      return <span data-testid="page">{model.id}</span>;
    };
    const PageComponent = withViewModel(PageVM, PageView);

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
