/**
 * @vitest-environment jsdom
 */
import { makeObservable, observable, action, reaction, runInAction } from 'mobx';
import {
  ViewModelBase,
  ViewModelStoreBase,
  type AnyViewModel,
  type AnyViewModelSimple,
  type ViewModelParams,
} from 'mobx-view-model';
import { ViewModelsProvider } from '../components/index.js';
import { useCreateViewModel } from '../hooks/index.js';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';
import { Suspense, useContext, type ReactNode } from 'react';
import { ViewModelsContext } from '../contexts/index.js';

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

afterEach(() => {
  cleanup();
});

/**
 * When two fibers create the same VM instance (viewModels.define returns the
 * existing instance for the same id), both fibers register the VM as
 * unconfirmed. Without dedup, the orphan cleanup kills the VM after only one
 * confirmCreation call removes one entry — the other entry remains and the
 * cleanup unmounts a VM that's still in use.
 */
describe('Orphan cleanup dedup: same VM instance from two fibers', () => {
  test('resolves vmData from the store resource by VM id', () => {
    const vmStore = new ViewModelStoreBase({
      resource: {
        read: (id) => ({ id, value: 42 }),
      },
    });

    class ResourceVM extends ViewModelBaseMock {}

    const Component = () => {
      const vm = useCreateViewModel(ResourceVM, undefined, { id: 'resource-vm' });
      return <span data-testid="vm-data">{String((vm.vmData as any).value)}</span>;
    };

    render(
      <ViewModelsProvider value={vmStore}>
        <Component />
      </ViewModelsProvider>,
    );

    expect(screen.getByTestId('vm-data').textContent).toBe('42');
  });

  test('constructor reactions stop when the VM is unmounted', async () => {
    const vmStore = new ViewModelStoreBaseMock();
    const source = observable.box(0);
    let runs = 0;

    class SubscribedVM extends ViewModelBaseMock {
      constructor(params?: Partial<ViewModelParams>) {
        super(params);
        reaction(
          () => source.get(),
          () => {
            runs += 1;
          },
          { signal: this.unmountSignal },
        );
      }
    }

    const Component = () => {
      useCreateViewModel(SubscribedVM, undefined, { id: 'subscribed' });
      return null;
    };

    const root = render(
      <ViewModelsProvider value={vmStore}>
        <Component />
      </ViewModelsProvider>,
    );

    runInAction(() => source.set(1));
    expect(runs).toBe(1);

    root.unmount();
    runInAction(() => source.set(2));
    expect(runs).toBe(1);
    expect(vmStore.get('subscribed')).toBeNull();
  });

  test('fixed-id VM with two sibling consumers: only 1 VM in store, cleanup does not kill it', async () => {
    const vmStore = new ViewModelStoreBaseMock();
    const mountLog: string[] = [];
    const unmountLog: string[] = [];

    class PageVM extends ViewModelBaseMock {
      mount() {
        mountLog.push(`PageVM:${this.id}`);
        return super.mount();
      }
      unmount() {
        unmountLog.push(`PageVM:${this.id}`);
        return super.unmount();
      }
    }

    /**
     * Two sibling components with the SAME fixed id → both call
     * viewModels.define with the same id → both get the same instance.
     * This simulates what happens when React 19 creates two fibers for
     * one component in a single render pass.
     */
    const FixedIdPage = ({ id }: { id: string }) => {
      const model = useCreateViewModel(PageVM, undefined, {
        id,
      });
      return <span data-testid={`page-${id}`}>{model.id}</span>;
    };

    const App = ({ children }: { children?: ReactNode }) => (
      <ViewModelsContext.Provider value={vmStore}>
        {children}
      </ViewModelsContext.Provider>
    );

    await act(async () => {
      render(
        <App>
          <FixedIdPage id="home" />
          <FixedIdPage id="home" />
        </App>,
      );
    });

    // Both fibers share the same VM instance — only 1 PageVM in the store
    expect(vmStore.getIds(PageVM)).toHaveLength(1);

    // The VM should be mounted
    const pageVmId = vmStore.getIds(PageVM)[0];
    const vm = vmStore.get(pageVmId);
    expect(vm).toBeDefined();
    expect((vm as any).isMounted).not.toBe(false);

    // Wait for the orphan cleanup setTimeout(0) to fire
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    // After orphan cleanup: the VM must STILL be alive and in the store
    expect(vmStore.getIds(PageVM)).toHaveLength(1);
    expect(unmountLog).toHaveLength(0);

    // The mount should have been called at least once
    const pageMounts = mountLog.filter((l) => l.startsWith('PageVM'));
    expect(pageMounts.length).toBeGreaterThanOrEqual(1);
  });

  test('fixed-id VM: orphan cleanup does not kill VM after Suspense remount', async () => {
    const vmStore = new ViewModelStoreBaseMock();
    const unmountLog: string[] = [];

    class PageVM extends ViewModelBaseMock {
      unmount() {
        unmountLog.push(`PageVM:${this.id}`);
        return super.unmount();
      }
    }

    const FixedIdPage = ({ id }: { id: string }) => {
      const model = useCreateViewModel(PageVM, undefined, {
        id,
      });
      return <span data-testid="page">{model.id}</span>;
    };

    const App = ({ children }: { children?: ReactNode }) => (
      <ViewModelsContext.Provider value={vmStore}>
        {children}
      </ViewModelsContext.Provider>
    );

    await act(async () => {
      render(
        <App>
          <Suspense fallback={<span data-testid="loading">Loading</span>}>
            <FixedIdPage id="home" />
          </Suspense>
        </App>,
      );
    });

    expect(vmStore.getIds(PageVM)).toHaveLength(1);

    // Wait for orphan cleanup
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    // VM should still be alive — not killed by orphan cleanup
    expect(vmStore.getIds(PageVM)).toHaveLength(1);
    expect(unmountLog).toHaveLength(0);
  });
});
