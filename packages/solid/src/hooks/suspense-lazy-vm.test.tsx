import { render, screen, waitFor } from '@solidjs/testing-library';
import { action, makeObservable, observable } from 'mobx';
import { enableObservableTracking } from 'mobx-solid';
import {
  createSignal,
  lazy,
  Suspense,
  Show,
  type Component,
} from 'solid-js';
import { beforeAll, describe, expect, test } from 'vitest';
import {
  ActiveViewModelProvider,
  ViewModelsProvider,
} from '../components/index.js';
import { withViewModel } from '../hoc/index.js';
import { useCreateViewModel } from '../hooks/index.js';
import {
  ViewModelBaseMock,
  ViewModelStoreBaseMock,
} from '../lib/test-mocks.js';

beforeAll(() => {
  enableObservableTracking();
});

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

describe('Solid Suspense + lazy VM', () => {
  test('lazy + Suspense + useCreateViewModel does not create duplicate VMs', async () => {
    const vmStore = new ViewModelStoreBaseMock();
    const routeStore = new RouteStore();

    class LayoutVM extends ViewModelBaseMock {}
    class PageVM extends ViewModelBaseMock {}

    const PageComponent: Component = () => {
      const vm = useCreateViewModel(PageVM, {}, { id: 'page-vm' });
      return <span data-testid="page">{vm.id}</span>;
    };

    let resolveModule!: (module: { default: Component }) => void;
    const LazyPage = lazy(
      () =>
        new Promise<{ default: Component }>((resolve) => {
          resolveModule = resolve;
        }),
    );

    const Layout = () => {
      const layoutVm = useCreateViewModel(LayoutVM);
      return (
        <ActiveViewModelProvider value={layoutVm}>
          <div data-testid="layout">
            <Suspense fallback={<span data-testid="loading">Loading</span>}>
              <Show when={() => routeStore.currentRoute === 'page'}>
                <LazyPage />
              </Show>
            </Suspense>
          </div>
        </ActiveViewModelProvider>
      );
    };

    render(() => (
      <ViewModelsProvider value={vmStore}>
        <Layout />
      </ViewModelsProvider>
    ));

    expect(vmStore.getIds(LayoutVM)).toHaveLength(1);
    expect(vmStore.getIds(PageVM)).toHaveLength(0);

    routeStore.navigate('page');
    expect(await screen.findByTestId('loading')).toBeDefined();
    expect(vmStore.getIds(PageVM)).toHaveLength(0);

    resolveModule({ default: PageComponent });

    expect(await screen.findByTestId('page')).toBeDefined();
    expect(screen.queryByTestId('loading')).toBeNull();
    expect(vmStore.getIds(LayoutVM)).toHaveLength(1);
    expect(vmStore.getIds(PageVM)).toHaveLength(1);
    expect(vmStore.get('page-vm')?.id).toBe('page-vm');
  });

  test('lazy + Suspense + withViewModel does not create duplicate VMs', async () => {
    const vmStore = new ViewModelStoreBaseMock();
    const routeStore = new RouteStore();

    class LayoutVM extends ViewModelBaseMock {}
    class PageVM extends ViewModelBaseMock {}

    const PageComponent = withViewModel(PageVM, (props) => (
      <span data-testid="page">{props.model.id}</span>
    ));

    let resolveModule!: (module: { default: Component }) => void;
    const LazyPage = lazy(
      () =>
        new Promise<{ default: Component }>((resolve) => {
          resolveModule = resolve;
        }),
    );

    const Layout = () => {
      const layoutVm = useCreateViewModel(LayoutVM);
      return (
        <ActiveViewModelProvider value={layoutVm}>
          <div data-testid="layout">
            <Suspense fallback={<span data-testid="loading">Loading</span>}>
              <Show when={() => routeStore.currentRoute === 'page'}>
                <LazyPage />
              </Show>
            </Suspense>
          </div>
        </ActiveViewModelProvider>
      );
    };

    render(() => (
      <ViewModelsProvider value={vmStore}>
        <Layout />
      </ViewModelsProvider>
    ));

    expect(vmStore.getIds(LayoutVM)).toHaveLength(1);
    expect(vmStore.getIds(PageVM)).toHaveLength(0);

    routeStore.navigate('page');
    expect(await screen.findByTestId('loading')).toBeDefined();
    expect(vmStore.getIds(PageVM)).toHaveLength(0);

    resolveModule({ default: PageComponent });

    expect(await screen.findByTestId('page')).toBeDefined();
    expect(screen.queryByTestId('loading')).toBeNull();
    expect(vmStore.getIds(LayoutVM)).toHaveLength(1);
    expect(vmStore.getIds(PageVM)).toHaveLength(1);
  });

  test('two sibling auto-id VMs of the same class stay distinct', async () => {
    const vmStore = new ViewModelStoreBaseMock();

    class LayoutVM extends ViewModelBaseMock {}
    class CardVM extends ViewModelBaseMock {}

    const Card = withViewModel(CardVM, (props) => (
      <span data-testid="card">{props.model.id}</span>
    ));

    const Layout = () => {
      const layoutVm = useCreateViewModel(LayoutVM);
      return (
        <ActiveViewModelProvider value={layoutVm}>
          <div>
            <Card />
            <Card />
          </div>
        </ActiveViewModelProvider>
      );
    };

    render(() => (
      <ViewModelsProvider value={vmStore}>
        <Layout />
      </ViewModelsProvider>
    ));

    const cards = await screen.findAllByTestId('card');
    expect(cards).toHaveLength(2);
    expect(vmStore.getIds(CardVM)).toHaveLength(2);
    const [idA, idB] = vmStore.getIds(CardVM);
    expect(idA).not.toBe(idB);
    expect(cards.map((node) => node.textContent).sort()).toEqual(
      [idA, idB].sort(),
    );
  });

  test('sibling same-class remount with auto-id keeps two distinct VMs', async () => {
    const vmStore = new ViewModelStoreBaseMock();

    class LayoutVM extends ViewModelBaseMock {}
    class CardVM extends ViewModelBaseMock {}

    const Card = withViewModel(CardVM, (props) => (
      <span data-testid="card">{props.model.id}</span>
    ));

    const [show, setShow] = createSignal(true);

    const Layout = () => {
      const layoutVm = useCreateViewModel(LayoutVM);
      return (
        <ActiveViewModelProvider value={layoutVm}>
          <Show when={show()}>
            <div>
              <Card />
              <Card />
            </div>
          </Show>
        </ActiveViewModelProvider>
      );
    };

    render(() => (
      <ViewModelsProvider value={vmStore}>
        <Layout />
      </ViewModelsProvider>
    ));

    expect(await screen.findAllByTestId('card')).toHaveLength(2);
    expect(vmStore.getIds(CardVM)).toHaveLength(2);
    const before = [...vmStore.getIds(CardVM)].sort();

    setShow(false);
    await waitFor(() => {
      expect(vmStore.getIds(CardVM)).toHaveLength(0);
    });

    setShow(true);
    expect(await screen.findAllByTestId('card')).toHaveLength(2);
    expect(vmStore.getIds(CardVM)).toHaveLength(2);
    const after = [...vmStore.getIds(CardVM)].sort();
    expect(after[0]).not.toBe(after[1]);
    // Fresh component instances → new createUniqueId values.
    expect(after).not.toEqual(before);
  });

  test('sibling same-class remount with explicit ids keeps the same ids', async () => {
    const vmStore = new ViewModelStoreBaseMock();

    class LayoutVM extends ViewModelBaseMock {}
    class CardVM extends ViewModelBaseMock {}

    const CardA = withViewModel(
      CardVM,
      (props) => <span data-testid="card-a">{props.model.id}</span>,
      { id: 'card-a' },
    );
    const CardB = withViewModel(
      CardVM,
      (props) => <span data-testid="card-b">{props.model.id}</span>,
      { id: 'card-b' },
    );

    const [show, setShow] = createSignal(true);

    const Layout = () => {
      const layoutVm = useCreateViewModel(LayoutVM);
      return (
        <ActiveViewModelProvider value={layoutVm}>
          <Show when={show()}>
            <CardA />
            <CardB />
          </Show>
        </ActiveViewModelProvider>
      );
    };

    render(() => (
      <ViewModelsProvider value={vmStore}>
        <Layout />
      </ViewModelsProvider>
    ));

    expect(await screen.findByTestId('card-a')).toBeDefined();
    expect(vmStore.getIds(CardVM).sort()).toEqual(['card-a', 'card-b']);

    setShow(false);
    await waitFor(() => {
      expect(vmStore.getIds(CardVM)).toHaveLength(0);
    });

    setShow(true);
    expect(await screen.findByTestId('card-a')).toBeDefined();
    expect(screen.getByTestId('card-b')).toBeDefined();
    expect(vmStore.getIds(CardVM).sort()).toEqual(['card-a', 'card-b']);
    expect(screen.getByTestId('card-a').textContent).toBe('card-a');
    expect(screen.getByTestId('card-b').textContent).toBe('card-b');
  });

  test('explicit id stays sticky across remount', async () => {
    const vmStore = new ViewModelStoreBaseMock();

    class PageVM extends ViewModelBaseMock {}

    const Page = withViewModel(
      PageVM,
      (props) => <span data-testid="page">{props.model.id}</span>,
      { id: 'sticky-page' },
    );

    const [show, setShow] = createSignal(true);

    render(() => (
      <ViewModelsProvider value={vmStore}>
        <Show when={show()}>
          <Page />
        </Show>
      </ViewModelsProvider>
    ));

    expect(await screen.findByTestId('page')).toBeDefined();
    expect(vmStore.getIds(PageVM)).toEqual(['sticky-page']);

    setShow(false);
    await waitFor(() => {
      expect(vmStore.getIds(PageVM)).toHaveLength(0);
      expect(screen.queryByTestId('page')).toBeNull();
    });

    setShow(true);
    expect(await screen.findByTestId('page')).toBeDefined();
    expect(vmStore.getIds(PageVM)).toEqual(['sticky-page']);
    expect(screen.getByTestId('page').textContent).toBe('sticky-page');
  });

  test('lazy page with Suspense under withViewModel layout', async () => {
    const vmStore = new ViewModelStoreBaseMock();

    class LayoutVM extends ViewModelBaseMock {
      title = 'layout';
    }
    class PageVM extends ViewModelBaseMock {}

    const Page = withViewModel(
      PageVM,
      (props) => <span data-testid="page">{props.model.id}</span>,
      { id: 'lazy-page' },
    );

    let resolveModule!: (module: { default: Component }) => void;
    const LazyPage = lazy(
      () =>
        new Promise<{ default: Component }>((resolve) => {
          resolveModule = resolve;
        }),
    );

    const [open, setOpen] = createSignal(false);

    const Layout = withViewModel(LayoutVM, () => (
      <div data-testid="layout">
        <Suspense fallback={<span data-testid="loading">Loading</span>}>
          <Show when={open()}>
            <LazyPage />
          </Show>
        </Suspense>
      </div>
    ));

    render(() => (
      <ViewModelsProvider value={vmStore}>
        <Layout />
      </ViewModelsProvider>
    ));

    expect(await screen.findByTestId('layout')).toBeDefined();
    expect(vmStore.getIds(PageVM)).toHaveLength(0);

    setOpen(true);
    expect(await screen.findByTestId('loading')).toBeDefined();

    resolveModule({ default: Page });
    expect(await screen.findByTestId('page')).toBeDefined();
    expect(vmStore.getIds(PageVM)).toEqual(['lazy-page']);
  });
});
