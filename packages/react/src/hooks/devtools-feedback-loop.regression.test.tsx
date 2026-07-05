/**
 * Regression: devtools feedback loop (githome repository page).
 *
 * Reproduces the pattern that caused infinite VM creation when mobx-vm devtools
 * were open: shell `withViewModel(RepositoryPageVM)` + child `useViewModel(RepositoryPageVM)`
 * + nested route `withViewModel(MergeRequestsVM)` + constructor `reaction` mutating
 * a global store during VM creation.
 *
 * Without Fix 5–7 this test fails (VM count grows or same id delete/add churn).
 *
 * @see DEVTOOLS-FEEDBACK-LOOP-FIX.md
 */
import { act, render, screen } from '@testing-library/react';
import { observer } from 'mobx-react-lite';
import { observable, observe, reaction, runInAction } from 'mobx';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, test } from 'vitest';
import type { ViewModelParams, ViewModelStore } from 'mobx-view-model';
import { ViewModelBaseMock } from '../../../core/src/view-model/view-model.base.test.js';
import { ViewModelStoreBaseMock } from '../../../core/src/view-model/view-model.store.base.test.js';
import { ViewModelsProvider } from '../components/index.js';
import { withViewModel } from '../hoc/index.js';
import { useViewModel } from './use-view-model.js';

const createVMStoreWrapper = (vmStore: ViewModelStore) => {
  return ({ children }: { children?: ReactNode }) => (
    <ViewModelsProvider value={vmStore}>{children}</ViewModelsProvider>
  );
};

const flushRegistryMicrotasks = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
};

describe('devtools feedback loop regression (githome repository)', () => {
  afterEach(() => {
    // noop — each test creates its own store
  });

  test('shell + useViewModel(child) + navigation: single parent VM, no registry churn loop', async () => {
    const globals = observable({ project: null as { id: number } | null });

    class RepositoryPageVM extends ViewModelBaseMock {
      constructor(params: ViewModelParams) {
        super(params);
        reaction(
          () => this.payload,
          () => {
            runInAction(() => {
              globals.project = { id: 43837 };
            });
          },
          { fireImmediately: true },
        );
      }
    }

    class MergeRequestsVM extends ViewModelBaseMock {}

    const RepositoryPage = observer(() => {
      globals.project;
      const model = useViewModel(RepositoryPageVM);
      return <div data-testid="repo-page">{model.id}</div>;
    });

    const MergeRequestsPage = withViewModel(
      MergeRequestsVM,
      observer(() => <div data-testid="mr-page">merge-requests</div>),
    );

    const RepositoryShell = withViewModel(
      RepositoryPageVM,
      observer(({ children }: { children?: ReactNode }) => (
        <div data-testid="shell">{children}</div>
      )),
    );

    const vmStore = new ViewModelStoreBaseMock({
      vmConfig: { useReactIds: true },
    });

    const registryChurn: string[] = [];
    const disposeObserve = observe(vmStore._viewModels, (change) => {
      if (change.type === 'add' || change.type === 'delete') {
        registryChurn.push(`${change.type}:${String(change.name)}`);
      }
    });

    try {
      const App = ({ route }: { route: 'repo' | 'mr' }) => (
        <RepositoryShell>
          {route === 'repo' ? <RepositoryPage /> : <MergeRequestsPage />}
        </RepositoryShell>
      );

      const { rerender } = render(<App route="repo" />, {
        wrapper: createVMStoreWrapper(vmStore),
      });

      await flushRegistryMicrotasks();

      const shellVmId = vmStore.getId(RepositoryPageVM);
      expect(shellVmId).toBeTruthy();
      expect(screen.getByTestId('repo-page').textContent).toBe(shellVmId);
      expect(vmStore.getIds(RepositoryPageVM)).toHaveLength(1);

      // Navigation: repository → merge requests (githome "Merge Requests" click)
      await act(async () => {
        rerender(<App route="mr" />);
      });
      await flushRegistryMicrotasks();

      expect(screen.getByTestId('mr-page')).toBeDefined();
      expect(vmStore.getIds(RepositoryPageVM)).toHaveLength(1);
      expect(vmStore.getIds(MergeRequestsVM)).toHaveLength(1);
      expect(vmStore._viewModels.size).toBe(2);

      // Navigation back + forced rerenders (devtools notify / sibling observer updates)
      await act(async () => {
        rerender(<App route="repo" />);
      });
      await flushRegistryMicrotasks();

      for (let i = 0; i < 5; i++) {
        await act(async () => {
          rerender(<App route="repo" />);
        });
        await flushRegistryMicrotasks();
      }

      expect(vmStore.getIds(RepositoryPageVM)).toHaveLength(1);
      // Child route unmounted — MR VM detached; must not leave stale duplicate shell VMs
      expect(vmStore.getIds(MergeRequestsVM)).toHaveLength(0);
      expect(vmStore._viewModels.size).toBe(1);
      expect(screen.getByTestId('repo-page').textContent).toBe(shellVmId);

      const shellChurn = registryChurn.filter((entry) =>
        entry.endsWith(String(shellVmId)),
      );
      // Loop symptom: delete/add/delete/add of the same shell VM id dozens of times.
      expect(shellChurn.length).toBeLessThanOrEqual(2);
    } finally {
      disposeObserve();
    }
  });

  test('reload-style rerenders: attach during render does not spawn duplicate VMs by class', async () => {
    class RepositoryPageVM extends ViewModelBaseMock {}

    const RepositoryPage = observer(() => {
      const model = useViewModel(RepositoryPageVM);
      return <div data-testid="repo-page">{model.id}</div>;
    });

    const RepositoryShell = withViewModel(
      RepositoryPageVM,
      observer(({ children }: { children?: ReactNode }) => (
        <div data-testid="shell">{children}</div>
      )),
    );

    const vmStore = new ViewModelStoreBaseMock({
      vmConfig: { useReactIds: true },
    });

    const App = () => (
      <RepositoryShell>
        <RepositoryPage />
      </RepositoryShell>
    );

    const { rerender } = render(<App />, {
      wrapper: createVMStoreWrapper(vmStore),
    });
    await flushRegistryMicrotasks();

    const initialId = screen.getByTestId('repo-page').textContent;

    for (let i = 0; i < 8; i++) {
      await act(async () => {
        rerender(<App />);
      });
      await flushRegistryMicrotasks();
    }

    expect(screen.getByTestId('repo-page').textContent).toBe(initialId);
    expect(vmStore.getIds(RepositoryPageVM)).toHaveLength(1);
    expect(vmStore._viewModels.size).toBe(1);
  });

  /**
   * Fix 8: githome `/merge-requests` → `/merge-requests/:id` showed a blank page when
   * Registry commit ran synchronously in a layout effect — `viewModels.set` during the
   * layout-effect chain caused delete/add loops on navigation (Fix 7). First paint must
   * still work via `tempHeap` until passive-effect commit.
   */
  test('Fix 8: MR list → MR detail commits VM synchronously (no blank page, no microtask flush)', async () => {
    class RepositoryPageVM extends ViewModelBaseMock {}
    class MergeRequestPageVM extends ViewModelBaseMock {}

    // githome MergeRequestPage: withViewModel(VM, Page) — no fallback component
    const MergeRequestPage = withViewModel(MergeRequestPageVM, ({ model }) => (
      <div data-testid="mr-detail">{model.id}</div>
    ));

    const MergeRequestsList = observer(() => (
      <div data-testid="mr-list">merge-requests</div>
    ));

    const RepositoryShell = withViewModel(
      RepositoryPageVM,
      observer(({ children }: { children?: ReactNode }) => (
        <div data-testid="shell">{children}</div>
      )),
    );

    const vmStore = new ViewModelStoreBaseMock({
      vmConfig: { useReactIds: true },
    });

    const App = ({ route }: { route: 'list' | 'detail' }) => (
      <RepositoryShell>
        {route === 'list' ? <MergeRequestsList /> : <MergeRequestPage />}
      </RepositoryShell>
    );

    const { rerender } = render(<App route="list" />, {
      wrapper: createVMStoreWrapper(vmStore),
    });

    expect(screen.getByTestId('mr-list')).toBeDefined();

    await act(async () => {
      rerender(<App route="detail" />);
    });

    // After act(), passive-effect commit must have run — VM in registry, not only tempHeap.
    const detailId = vmStore.getId(MergeRequestPageVM);
    expect(detailId).toBeTruthy();
    expect(vmStore._viewModels.has(detailId!)).toBe(true);
    expect(vmStore._viewModelsTempHeap.has(detailId!)).toBe(false);
    expect(screen.getByTestId('mr-detail')).toBeDefined();
    expect(vmStore.getIds(MergeRequestPageVM)).toHaveLength(1);
    expect(vmStore._viewModels.size).toBe(2);
  });

  test('Fix 8: repeated MR list ↔ detail navigation keeps detail VM committed', async () => {
    class RepositoryPageVM extends ViewModelBaseMock {}
    class MergeRequestPageVM extends ViewModelBaseMock {}

    const MergeRequestPage = withViewModel(MergeRequestPageVM, ({ model }) => (
      <div data-testid="mr-detail">{model.id}</div>
    ));

    const MergeRequestsList = observer(() => (
      <div data-testid="mr-list">merge-requests</div>
    ));

    const RepositoryShell = withViewModel(
      RepositoryPageVM,
      observer(({ children }: { children?: ReactNode }) => (
        <div data-testid="shell">{children}</div>
      )),
    );

    const vmStore = new ViewModelStoreBaseMock({
      vmConfig: { useReactIds: true },
    });

    const App = ({ route }: { route: 'list' | 'detail' }) => (
      <RepositoryShell>
        {route === 'list' ? <MergeRequestsList /> : <MergeRequestPage />}
      </RepositoryShell>
    );

    const { rerender } = render(<App route="list" />, {
      wrapper: createVMStoreWrapper(vmStore),
    });

    for (let i = 0; i < 2; i++) {
      await act(async () => {
        rerender(<App route="detail" />);
      });

      const detailId = vmStore.getId(MergeRequestPageVM);
      expect(detailId).toBeTruthy();
      expect(vmStore._viewModels.has(detailId!)).toBe(true);
      expect(screen.getByTestId('mr-detail')).toBeDefined();

      await act(async () => {
        rerender(<App route="list" />);
      });

      expect(screen.getByTestId('mr-list')).toBeDefined();
      expect(vmStore.getIds(MergeRequestPageVM)).toHaveLength(0);
    }
  });

  test('Fix 7+8: leaving MR detail does not delete/add loop shell RepositoryPageVM', async () => {
    class RepositoryPageVM extends ViewModelBaseMock {}
    class MergeRequestPageVM extends ViewModelBaseMock {}

    const MergeRequestPage = withViewModel(MergeRequestPageVM, ({ model }) => (
      <div data-testid="mr-detail">{model.id}</div>
    ));

    const MergeRequestsList = observer(() => (
      <div data-testid="mr-list">merge-requests</div>
    ));

    const RepositoryShell = withViewModel(
      RepositoryPageVM,
      observer(({ children }: { children?: ReactNode }) => (
        <div data-testid="shell">{children}</div>
      )),
    );

    const vmStore = new ViewModelStoreBaseMock({
      vmConfig: { useReactIds: true },
    });

    const registryChurn: string[] = [];
    const disposeObserve = observe(vmStore._viewModels, (change) => {
      if (change.type === 'add' || change.type === 'delete') {
        registryChurn.push(`${change.type}:${String(change.name)}`);
      }
    });

    try {
      const App = ({ route }: { route: 'list' | 'detail' }) => (
        <RepositoryShell>
          {route === 'list' ? <MergeRequestsList /> : <MergeRequestPage />}
        </RepositoryShell>
      );

      const { rerender } = render(<App route="detail" />, {
        wrapper: createVMStoreWrapper(vmStore),
      });

      await flushRegistryMicrotasks();

      const shellVmId = vmStore.getId(RepositoryPageVM);
      expect(shellVmId).toBeTruthy();
      expect(screen.getByTestId('mr-detail')).toBeDefined();

      registryChurn.length = 0;

      await act(async () => {
        rerender(<App route="list" />);
      });
      await flushRegistryMicrotasks();

      expect(screen.getByTestId('mr-list')).toBeDefined();
      expect(vmStore.getIds(MergeRequestPageVM)).toHaveLength(0);
      expect(vmStore.getIds(RepositoryPageVM)).toHaveLength(1);

      const shellChurn = registryChurn.filter((entry) =>
        entry.endsWith(String(shellVmId)),
      );
      expect(shellChurn.length).toBeLessThanOrEqual(2);
    } finally {
      disposeObserve();
    }
  });
});
