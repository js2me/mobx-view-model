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
   * React 19 + lazy + Suspense + withViewModel(observer) + auto useId
   *
   * Cycle without the deferred-unmount reuse fix:
   * 1. RouteView (observer) reads route → re-renders
   * 2. Renders page via React.lazy inside Suspense
   * 3. withViewModel creates VM → define()/unmount() mutates store observables
   * 4. Parent observers re-render → Suspense remounts → new useId → new VM
   * 5. Infinite duplicates
   */
  test('withViewModel + observer + Suspense + useId does not create duplicate VMs', async () => {
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
    expect(vmStore.getIds(PageVM)).toHaveLength(0);

    await act(async () => {
      resolveModule({ default: PageComponent });
    });

    expect(vmStore.getIds(LayoutVM)).toHaveLength(1);
    expect(vmStore.getIds(PageVM)).toHaveLength(1);

    expect(screen.getByTestId('page')).toBeDefined();
    expect(screen.queryByTestId('loading')).toBeNull();
  });

  test('two sibling auto-id VMs of the same class stay distinct', async () => {
    const vmStore = new ViewModelStoreBaseMock();

    class LayoutVM extends ViewModelBaseMock {}
    class CardVM extends ViewModelBaseMock {}

    const Card = withViewModel(CardVM, ({ model }) => (
      <span data-testid={`card-${model.id}`}>{model.id}</span>
    ));

    const Layout = observer(() => {
      const layoutVm = useCreateViewModel(LayoutVM);
      return (
        <ActiveViewModelProvider value={layoutVm}>
          <div>
            <Card />
            <Card />
          </div>
        </ActiveViewModelProvider>
      );
    });

    await act(async () =>
      render(
        <ViewModelsProvider value={vmStore}>
          <Layout />
        </ViewModelsProvider>,
      ),
    );

    expect(vmStore.getIds(CardVM)).toHaveLength(2);
    const [idA, idB] = vmStore.getIds(CardVM);
    expect(idA).not.toBe(idB);
    expect(screen.getByTestId(`card-${idA}`)).toBeDefined();
    expect(screen.getByTestId(`card-${idB}`)).toBeDefined();
  });

  test('sibling same-class remount with auto-id keeps two distinct VMs when useId changes', async () => {
    const vmStore = new ViewModelStoreBaseMock();

    class LayoutVM extends ViewModelBaseMock {}
    class CardVM extends ViewModelBaseMock {}

    const Card = withViewModel(CardVM, ({ model }) => (
      <span data-testid="card">{model.id}</span>
    ));

    const Layout = ({ slot }: { slot: string }) => {
      const layoutVm = useCreateViewModel(LayoutVM);
      return (
        <ActiveViewModelProvider value={layoutVm}>
          {/* New key → new fibers → new useId(); claimPendingVm sees 2
              pending matches and refuses reclaim. */}
          <div key={slot}>
            <Card />
            <Card />
          </div>
        </ActiveViewModelProvider>
      );
    };

    const App = ({ slot }: { slot: string }) => (
      <ViewModelsProvider value={vmStore}>
        <Layout slot={slot} />
      </ViewModelsProvider>
    );

    const view = await act(async () => render(<App slot="a" />));
    expect(vmStore.getIds(CardVM)).toHaveLength(2);
    const before = [...vmStore.getIds(CardVM)].sort();

    await act(async () => {
      view.rerender(<App slot="b" />);
    });
    await act(async () => {});

    expect(vmStore.getIds(CardVM)).toHaveLength(2);
    const after = [...vmStore.getIds(CardVM)].sort();
    expect(after[0]).not.toBe(after[1]);
    expect(screen.getAllByTestId('card')).toHaveLength(2);
    // New useIds + no single pending reclaim → fresh instance ids.
    expect(after).not.toEqual(before);
  });

  test('sibling same-class remount with explicit ids keeps the same ids', async () => {
    const vmStore = new ViewModelStoreBaseMock();

    class LayoutVM extends ViewModelBaseMock {}
    class CardVM extends ViewModelBaseMock {}

    const CardA = withViewModel(CardVM, ({ model }) => (
      <span data-testid="card-a">{model.id}</span>
    ), { id: 'card-a' });
    const CardB = withViewModel(CardVM, ({ model }) => (
      <span data-testid="card-b">{model.id}</span>
    ), { id: 'card-b' });

    const Layout = ({ show }: { show: boolean }) => {
      const layoutVm = useCreateViewModel(LayoutVM);
      return (
        <ActiveViewModelProvider value={layoutVm}>
          {show ? (
            <>
              <CardA />
              <CardB />
            </>
          ) : null}
        </ActiveViewModelProvider>
      );
    };

    const App = ({ show }: { show: boolean }) => (
      <ViewModelsProvider value={vmStore}>
        <Layout show={show} />
      </ViewModelsProvider>
    );

    const view = await act(async () => render(<App show />));
    expect(vmStore.getIds(CardVM).sort()).toEqual(['card-a', 'card-b']);

    await act(async () => {
      view.rerender(<App show={false} />);
      view.rerender(<App show />);
    });
    await act(async () => {});

    expect(vmStore.getIds(CardVM).sort()).toEqual(['card-a', 'card-b']);
    expect(screen.getByTestId('card-a').textContent).toBe('card-a');
    expect(screen.getByTestId('card-b').textContent).toBe('card-b');
  });

  test('explicit id stays sticky across remount', async () => {
    const vmStore = new ViewModelStoreBaseMock();

    class PageVM extends ViewModelBaseMock {}

    const Page = withViewModel(PageVM, ({ model }) => (
      <span data-testid="page">{model.id}</span>
    ), { id: 'sticky-page' });

    const App = ({ show }: { show: boolean }) => (
      <ViewModelsProvider value={vmStore}>
        {show ? <Page /> : null}
      </ViewModelsProvider>
    );

    const view = await act(async () => render(<App show />));
    expect(vmStore.getIds(PageVM)).toEqual(['sticky-page']);

    await act(async () => {
      view.rerender(<App show={false} />);
    });
    // deferred unmount — still present until microtask flush
    await act(async () => {});
    expect(vmStore.getIds(PageVM)).toHaveLength(0);

    await act(async () => {
      view.rerender(<App show />);
    });
    expect(vmStore.getIds(PageVM)).toEqual(['sticky-page']);
    expect(screen.getByTestId('page').textContent).toBe('sticky-page');
  });
});
