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

class VirtualRoute {
  status: 'unknown' | 'opening' | 'opened' = 'unknown';

  get isOpened() { return this.status === 'opened'; }
  get isOpening() { return this.status === 'opening'; }

  constructor() {
    makeObservable(this, {
      status: observable.ref,
      isOpened: computed,
      isOpening: computed,
      open: action,
    });
  }

  async open() {
    runInAction(() => { this.status = 'opening'; });
    await undefined;
    await undefined;
    runInAction(() => { this.status = 'opened'; });
  }
}

afterEach(() => { cleanup(); });

describe('VirtualRoute async open + findVmInStore', () => {
  /**
   * Simulates gozon's RouteViewGroup pattern:
   * - observer renders null when route is inactive
   * - useEffect triggers VirtualRoute.open() (async with microtask pauses)
   * - observer renders Layout + Suspense + lazy NotFoundPage when route opens
   */
  test('VirtualRoute async open + Suspense + withViewModel auto-id: only 1 VM', async () => {
    const vmStore = new ViewModelStoreBaseMock();
    const notFoundRoute = new VirtualRoute();
    const mountLog: string[] = [];

    class LayoutVM extends ViewModelBaseMock {
      mount() { mountLog.push(`LayoutVM:${this.id}`); return super.mount(); }
    }
    class NotFoundPageVM extends ViewModelBaseMock {
      mount() { mountLog.push(`NotFoundPageVM:${this.id}`); return super.mount(); }
    }

    const NotFoundPageView = ({ model }: { model: InstanceType<typeof NotFoundPageVM> }) => (
      <span data-testid="not-found">{model.id}</span>
    );
    const NotFoundPageComponent = withViewModel(NotFoundPageVM, NotFoundPageView);

    let resolveModule!: (module: { default: ComponentType }) => void;
    const LazyNotFoundPage = lazy(
      () => new Promise<{ default: ComponentType }>((resolve) => { resolveModule = resolve; }),
    );

    const RouteViewGroupLike = observer(() => {
      const isActive = notFoundRoute.isOpened || notFoundRoute.isOpening;
      useEffect(() => {
        if (!isActive) { notFoundRoute.open(); }
      }, [isActive]);
      if (!isActive) return null;
      return (
        <LayoutLike>
          <LazyNotFoundPage />
        </LayoutLike>
      );
    });

    const LayoutLike = withViewModel(
      LayoutVM,
      ({ children, model }: { children: React.ReactNode; model: InstanceType<typeof LayoutVM> }) => (
        <ActiveViewModelProvider value={model}>
          <div data-testid="layout">
            <Suspense fallback={<span data-testid="loading">Loading</span>}>
              {children}
            </Suspense>
          </div>
        </ActiveViewModelProvider>
      ),
    );

    await act(async () =>
      render(<ViewModelsProvider value={vmStore}><RouteViewGroupLike /></ViewModelsProvider>),
    );

    // VirtualRoute.open() starts — Layout already mounted by act()
    expect(vmStore.getIds(LayoutVM).length).toBeGreaterThanOrEqual(1);
    expect(vmStore.getIds(NotFoundPageVM)).toHaveLength(0);

    // Resolve lazy module — Suspense resolves → NotFoundPage mounts
    await act(async () => { resolveModule({ default: NotFoundPageComponent }); });

    // Key check: only 1 NotFoundPageVM, not 2
    expect(vmStore.getIds(NotFoundPageVM)).toHaveLength(1);
    expect(screen.getByTestId('not-found')).toBeDefined();
    const pageMounts = mountLog.filter((l) => l.startsWith('NotFoundPageVM'));
    expect(pageMounts).toHaveLength(1);
  });

  /**
   * Verify that findVmInStore's committedVmIds guard prevents reclaiming
   * sibling VMs in the same render pass.
   */
  test('sibling same-class VMs are NOT reclaimed by findVmInStore', async () => {
    const vmStore = new ViewModelStoreBaseMock();
    class LayoutVM extends ViewModelBaseMock {}
    class CardVM extends ViewModelBaseMock {}

    const Card = withViewModel(CardVM, ({ model }: { model: InstanceType<typeof CardVM> }) => (
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
      render(<ViewModelsProvider value={vmStore}><Layout /></ViewModelsProvider>),
    );

    // Two distinct CardVMs, not 1 shared via findVmInStore
    expect(vmStore.getIds(CardVM)).toHaveLength(2);
  });
});
