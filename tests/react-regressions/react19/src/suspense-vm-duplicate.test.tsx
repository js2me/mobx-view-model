import { makeObservable } from 'mobx';
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

/**
 * Minimal mock of ViewModelBase that accepts partial params and calls
 * makeObservable(this). Mirrors the internal ViewModelBaseMock used in
 * the package's own tests.
 */
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

/**
 * Minimal mock of ViewModelStoreBase that exposes internal maps for
 * test assertions (e.g. instanceAttachedCount).
 * Configured with useReactIds: true to match the real app setup where
 * VM ids include React's useId() — the key condition for the infinite-loop
 * bug in React 19 + lazy + Suspense.
 */
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

describe('Suspense VM duplicate prevention', () => {
  /**
   * When a component using useCreateViewModel suspends during initial render,
   * React discards the render tree. The VM was created and attached during
   * that render, but the layout effect cleanup never runs — leaving an
   * "orphaned" VM in the store. On retry, useCreateViewModel should find
   * and reuse that orphan VM instead of creating a duplicate.
   */
  test('reuses existing VM of same class with same parent when Suspense discards render', async () => {
    const vmStore = new ViewModelStoreBaseMock();

    class ParentVM extends ViewModelBaseMock {}
    class ChildVM extends ViewModelBaseMock<Record<string, never>, ParentVM> {}

    // Create a parent VM (simulating what withViewModel would create)
    const parentVm = new ParentVM({ id: 'parent', viewModels: vmStore });
    await vmStore.attach(parentVm);

    // Create an orphan child VM with the same parent (simulating a VM
    // from a discarded Suspense render that was attached but never detached)
    const orphanChild = new ChildVM({
      id: 'orphan-child',
      parentViewModel: parentVm,
      viewModels: vmStore,
    });
    await vmStore.attach(orphanChild);

    // Verify orphan is in store
    expect(vmStore.getIds(ChildVM)).toHaveLength(1);

    // Now render a component that uses useCreateViewModel(ChildVM)
    // inside the same parent context — it should reuse the orphan
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

    // Should reuse the orphan ChildVM, not create a new one
    expect(vmStore.getIds(ChildVM)).toHaveLength(1);
    expect(vmStore.get(ChildVM)).toBe(orphanChild);

    // After unmount, the VM should be fully removed from the store
    await act(async () => {
      unmount();
    });

    expect(vmStore.get(orphanChild.id)).toBeNull();
  });

  test('balances instanceAttachedCount when reusing orphan VM from discarded render', async () => {
    const vmStore = new ViewModelStoreBaseMock();

    class ParentVM extends ViewModelBaseMock {}
    class ChildVM extends ViewModelBaseMock<Record<string, never>, ParentVM> {}

    // Create a parent VM
    const parentVm = new ParentVM({ id: 'parent', viewModels: vmStore });
    await vmStore.attach(parentVm);

    // Create an orphan child VM (attached once during discarded render)
    const orphanChild = new ChildVM({
      id: 'orphan-child',
      parentViewModel: parentVm,
      viewModels: vmStore,
    });
    await vmStore.attach(orphanChild);

    // Orphan has attachedCount = 1
    expect(vmStore._instanceAttachedCount.get(orphanChild.id)).toBe(1);

    // Render a component that reuses the orphan — attach() will be called
    // again during render, making attachedCount = 2. The layout effect
    // should then detach once to balance it back to 1.
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

    // After layout effect, attachedCount should be balanced back to 1
    // (one detach in layout effect for the ghost attach from discarded render,
    // plus one attach during this render → net: +1 -1 = 0 from original 1)
    expect(vmStore._instanceAttachedCount.get(orphanChild.id)).toBe(1);

    // Unmount should detach and fully remove the VM
    await act(async () => {
      unmount();
    });

    expect(vmStore._instanceAttachedCount.get(orphanChild.id)).toBeUndefined();
    expect(vmStore.get(orphanChild.id)).toBeNull();
  });

  /**
   * This is the real-world scenario that triggered the infinite-loop bug
   * in React 19 + lazy + Suspense with useReactIds: true.
   *
   * The real app does NOT use suspendUntil. The cycle is:
   * 1. lazy() component loads → renders → useCreateViewModel creates a VM
   *    with a useId()-based id (e.g. "PageVM__r_1_") and attaches it
   * 2. attach() mutates MobX observables in the store (viewModels map,
   *    viewModelIdsByClasses, instanceAttachedCount, mountedViewsCount)
   * 3. An observer() component that tracks store state re-renders
   * 4. React 19 re-evaluates the component inside Suspense — if it
   *    discards and retries, the component gets a NEW useId()
   * 5. generateViewModelId produces a new id "PageVM__r_2_"
   * 6. viewModels.get("PageVM__r_2_") returns null → NEW VM created
   * 7. Back to step 2 → infinite loop (61+ duplicate VMs in production)
   *
   * The orphan-reuse logic breaks this cycle: on step 6, instead of
   * creating a new VM, it finds the existing uncommitted VM of the same
   * class with the same parent and returns it. No new VM = no MobX
   * reaction = no re-render = cycle broken.
   */
  test('React.lazy + Suspense + observer + useReactIds does not create duplicate VMs', async () => {
    const vmStore = new ViewModelStoreBaseMock();

    class LayoutVM extends ViewModelBaseMock {}
    class PageVM extends ViewModelBaseMock {}

    // The PageComponent is wrapped in observer() just like in the real app.
    // It accesses the store's mountedViewsCount — this creates a MobX
    // reaction that triggers re-renders when attach() modifies store state,
    // exactly the mechanism that fuels the infinite loop.
    const PageComponent = observer(() => {
      const vm = useCreateViewModel(PageVM);
      // Access store observables to create a MobX tracking context,
      // simulating what happens in real app components that read from the store.
      const count = vmStore.mountedViewsCount;
      return <span data-testid="page">{vm.id}:{count}</span>;
    });

    // Simulate React.lazy: the component is not available immediately.
    let resolveModule!: (module: { default: ComponentType }) => void;
    const LazyPage = lazy(
      () =>
        new Promise<{ default: ComponentType }>((resolve) => {
          resolveModule = resolve;
        }),
    );

    // LayoutVM is OUTSIDE the Suspense boundary — it persists across
    // Suspense retries, so its instance is stable and the orphan check
    // can match parentViewModel correctly.
    const LayoutComponent = observer(() => {
      const layoutVm = useCreateViewModel(LayoutVM);
      return (
        <ActiveViewModelProvider value={layoutVm}>
          <div data-testid="layout">
            <Suspense fallback={<span data-testid="loading">Loading</span>}>
              <LazyPage />
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

    // Fallback should be showing (lazy module hasn't loaded yet)
    expect(screen.getByTestId('loading')).toBeDefined();

    // LayoutVM is outside Suspense — should be exactly 1
    expect(vmStore.getIds(LayoutVM)).toHaveLength(1);

    // PageVM should NOT exist yet — lazy component never rendered
    expect(vmStore.getIds(PageVM)).toHaveLength(0);

    // "Load" the lazy module — this resolves the promise and lets
    // React render PageComponent inside the Suspense boundary.
    await act(async () => {
      resolveModule({ default: PageComponent });
    });

    // After loading, should be only 1 of each VM type.
    // Without the orphan-reuse fix, React 19 + useReactIds + observer
    // would spiral into an infinite loop creating duplicate PageVMs
    // (one per useId() increment: _r_1_, _r_2_, _r_3_, … → 61+ in prod).
    expect(vmStore.getIds(LayoutVM)).toHaveLength(1);
    expect(vmStore.getIds(PageVM)).toHaveLength(1);

    // Content should be visible, fallback gone
    expect(screen.getByTestId('page')).toBeDefined();
    expect(screen.queryByTestId('loading')).toBeNull();
  });
});
