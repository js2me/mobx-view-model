import { makeObservable } from 'mobx';
import {
  ViewModelBase,
  ViewModelStoreBase,
  type AnyViewModel,
  type AnyViewModelSimple,
  type ViewModelParams,
} from 'mobx-view-model';
import {
  ViewModelsProvider,
  withViewModel,
} from 'mobx-view-model-react';
import { act, cleanup, render, screen } from '@testing-library/react';
import {
  Component,
  Suspense,
  lazy,
  startTransition,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react';
import { afterEach, describe, expect, test } from 'vitest';

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

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return <span data-testid="error">{this.state.error.message}</span>;
    }
    return this.props.children;
  }
}

afterEach(() => {
  cleanup();
});

describe('React 19 lazy and Suspense VM lifecycle', () => {
  test('a transition keeps the revealed route and its VM until the lazy route commits', async () => {
    const vmStore = new ViewModelStoreBaseMock();
    class HomeVM extends ViewModelBaseMock {}
    class PageVM extends ViewModelBaseMock {}

    const Home = withViewModel(HomeVM, ({ model }) => (
      <span data-testid="home">{model.id}</span>
    ));
    const Page = withViewModel(PageVM, ({ model }) => (
      <span data-testid="page">{model.id}</span>
    ));

    let resolvePage!: (module: { default: ComponentType }) => void;
    const LazyPage = lazy(
      () =>
        new Promise<{ default: ComponentType }>((resolve) => {
          resolvePage = resolve;
        }),
    );

    let navigate!: () => void;
    const Router = () => {
      const [route, setRoute] = useState<'home' | 'page'>('home');
      navigate = () => {
        startTransition(() => {
          setRoute('page');
        });
      };
      return route === 'home' ? <Home /> : <LazyPage />;
    };

    await act(async () => {
      render(
        <ViewModelsProvider value={vmStore}>
          <Suspense fallback={<span data-testid="loading">Loading</span>}>
            <Router />
          </Suspense>
        </ViewModelsProvider>,
      );
    });

    expect(vmStore.getIds(HomeVM)).toHaveLength(1);
    expect(screen.getByTestId('home')).toBeDefined();

    await act(async () => {
      navigate();
    });

    expect(screen.getByTestId('home')).toBeDefined();
    expect(screen.queryByTestId('loading')).toBeNull();
    expect(vmStore.getIds(HomeVM)).toHaveLength(1);
    expect(vmStore.getIds(PageVM)).toHaveLength(0);

    await act(async () => {
      resolvePage({ default: Page });
    });
    await act(async () => {});

    expect(screen.getByTestId('page')).toBeDefined();
    expect(vmStore.getIds(PageVM)).toHaveLength(1);
    expect(vmStore.getIds(HomeVM)).toHaveLength(0);
  });

  test('a rejected nested lazy module leaves no discarded page VM in the store', async () => {
    const vmStore = new ViewModelStoreBaseMock();
    class PageVM extends ViewModelBaseMock {}

    let rejectChild!: (error: Error) => void;
    const LazyChild = lazy(
      () =>
        new Promise<{ default: ComponentType }>((_resolve, reject) => {
          rejectChild = reject;
        }),
    );
    const Page = withViewModel(PageVM, () => (
      <div data-testid="page">
        <LazyChild />
      </div>
    ));

    let resolvePage!: (module: { default: ComponentType }) => void;
    const LazyPage = lazy(
      () =>
        new Promise<{ default: ComponentType }>((resolve) => {
          resolvePage = resolve;
        }),
    );

    await act(async () => {
      render(
        <ViewModelsProvider value={vmStore}>
          <ErrorBoundary>
            <Suspense fallback={<span data-testid="loading">Loading</span>}>
              <LazyPage />
            </Suspense>
          </ErrorBoundary>
        </ViewModelsProvider>,
      );
    });

    await act(async () => {
      resolvePage({ default: Page });
    });
    expect(screen.getByTestId('loading')).toBeDefined();

    await act(async () => {
      rejectChild(new Error('Lazy child failed'));
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    expect(screen.getByTestId('error').textContent).toBe('Lazy child failed');
    expect(vmStore.getIds(PageVM)).toHaveLength(0);
  });
});
