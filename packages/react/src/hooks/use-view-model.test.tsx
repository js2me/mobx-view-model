import { act, fireEvent, render, screen } from '@testing-library/react';
import { observer } from 'mobx-react-lite';
import { observable, reaction, runInAction } from 'mobx';
import { useState, type ReactNode } from 'react';
import { beforeEach, describe, expect, test } from 'vitest';
import { createCounter } from 'yummies/complex';
import type { ViewModelStore, ViewModelParams } from 'mobx-view-model';
import { ViewModelBaseMock } from '../../../core/src/view-model/view-model.base.test.js';
import { ViewModelStoreBaseMock } from '../../../core/src/view-model/view-model.store.base.test.js';
import { ViewModelsProvider } from '../components/index.js';
import { withViewModel } from '../hoc/index.js';
import { useViewModel } from './use-view-model.js';

describe('useViewModel', () => {
  const generateId = createCounter(String);

  beforeEach(() => {
    generateId.reset();
  });

  const createDepthComponent = (
    depth: number,
    {
      accessUsing,
      parent,
      getParent,
    }: {
      accessUsing: 'generic' | 'class-ref' | 'id' | 'component-ref';
      parent?: any;
      getParent?: boolean;
    },
  ) => {
    class VM1 extends ViewModelBaseMock {
      depth = `${depth}`;
    }

    const Component = withViewModel(VM1, {
      id: accessUsing === 'id' ? `depth-${depth}` : undefined,
      generateId,
    })(({ children }: { children?: ReactNode }) => {
      let model!: VM1;

      if (accessUsing) {
        switch (accessUsing) {
          case 'generic': {
            model = useViewModel<VM1>();

            break;
          }
          case 'class-ref': {
            model = useViewModel(getParent ? parent?.VM : VM1);

            break;
          }
          case 'component-ref': {
            model = useViewModel(getParent ? parent : Component);

            break;
          }
          case 'id': {
            model = useViewModel<VM1>(
              getParent ? parent?.id : `depth-${depth}`,
            );

            break;
          }
          // No default
        }
      }

      return (
        <div
          data-testid={`depth-component-(depth:${depth}, accessUsing:${accessUsing})`}
        >
          <span>{`model-id: ${model.id}, depth: ${model.depth}`}</span>
          {children}
        </div>
      );
    });

    Object.assign(Component, { VM: VM1, depth, id: `depth-${depth}` });

    return Component as typeof Component & {
      VM: typeof VM1;
      depth: number;
      id: string;
    };
  };

  const createVMStoreWrapper = (vmStore: ViewModelStore) => {
    return ({ children }: { children?: ReactNode }) => {
      return (
        <ViewModelsProvider value={vmStore}>{children}</ViewModelsProvider>
      );
    };
  };

  const createTests = (
    accessUsing: 'generic' | 'class-ref' | 'id' | 'component-ref',
    withVmStore?: boolean,
    getParent?: boolean,
  ) => {
    const createDepthTest = (depth: number) => {
      const depthsComponents: any[] = [];

      Array.from({ length: depth })
        .fill(null)
        .forEach((_, i) => {
          const componentDepth = i + 1;
          const depthComponent = createDepthComponent(componentDepth, {
            accessUsing,
            parent: getParent ? depthsComponents.at(-1) : undefined,
            getParent,
          });

          depthsComponents.push(depthComponent);
        });

      test(`renders (${depth} depth)`, async () => {
        const vmStore = new ViewModelStoreBaseMock();

        const WrappedDepthComponent = () => {
          const reversed = [...depthsComponents].reverse();

          let lastRenderedNode: any;

          reversed.forEach((Component) => {
            if (lastRenderedNode) {
              lastRenderedNode = <Component>{lastRenderedNode}</Component>;
            } else {
              lastRenderedNode = <Component />;
            }
          });

          return lastRenderedNode;
        };
        const { container } = await act(async () =>
          render(<WrappedDepthComponent />, {
            wrapper: withVmStore ? createVMStoreWrapper(vmStore) : undefined,
          }),
        );

        await expect(container.firstChild).toMatchFileSnapshot(
          `../../../../tests/snapshots/hooks/use-view-model/${getParent ? 'parent-instance' : 'self-instance'}/access-using-${accessUsing}/${withVmStore ? 'with-view-model-store/' : ''}${depth}-depth.html`,
        );
      });
    };

    Array.from({ length: 10 })
      .fill(null)
      .forEach((_, i) => {
        const depth = i + 1;
        if (depth === undefined) return;
        createDepthTest(depth);
      });
  };

  describe('self instance', () => {
    describe('access using generic', () => {
      createTests('generic');
    });
    describe('access using class reference', () => {
      createTests('class-ref');
    });
    describe('access using view model id', () => {
      createTests('id');
    });
    describe('access using view model component ref', () => {
      createTests('component-ref');
    });

    describe('with ViewModelStore', () => {
      describe('access using generic', () => {
        createTests('generic', true);
      });
      describe('access using class reference', () => {
        createTests('class-ref', true);
      });
      describe('access using view model id', () => {
        createTests('id', true);
      });
      describe('access using view model component ref', () => {
        createTests('component-ref', true);
      });
    });
  });

  describe('parent instance', () => {
    describe('access using generic', () => {
      createTests('generic', false, true);
    });
    describe('access using class reference', () => {
      createTests('class-ref', false, true);
    });
    describe('access using view model id', () => {
      createTests('id', false, true);
    });
    describe('access using view model component ref', () => {
      createTests('component-ref', false, true);
    });

    describe('with ViewModelStore', () => {
      describe('access using generic', () => {
        createTests('generic', true, true);
      });
      describe('access using class reference', () => {
        createTests('class-ref', true, true);
      });
      describe('access using view model id', () => {
        createTests('id', true, true);
      });
      describe('access using view model component ref', () => {
        createTests('component-ref', true, true);
      });
    });
  });

  describe('scenarios', () => {
    test('container renders VM with fixed id and some child with dynamic id', async ({
      task,
    }) => {
      const vmStore = new ViewModelStoreBaseMock();

      class LayoutVM extends ViewModelBaseMock {}

      const Layout = withViewModel(LayoutVM, {
        id: 'layout',
      })(({ children }: { children?: ReactNode }) => (
        <div data-testid={'layout'}>{children}</div>
      ));

      class ChildVM extends ViewModelBaseMock {}

      const Child = withViewModel(ChildVM)(() => <div data-testid={'child'} />);

      const App = () => {
        return (
          <div>
            <Layout>
              <Child />
            </Layout>
          </div>
        );
      };

      const { container } = await act(async () =>
        render(<App />, { wrapper: createVMStoreWrapper(vmStore) }),
      );

      await expect(container.firstChild).toMatchFileSnapshot(
        `../../../../tests/snapshots/hooks/use-view-model/scenarios/${task.name}.html`,
      );
    });
    test('container remounts VM with fixed id and some child with dynamic id', async ({
      task,
    }) => {
      const vmStore = new ViewModelStoreBaseMock();

      class LayoutVM extends ViewModelBaseMock {}

      const Layout = withViewModel(LayoutVM, {
        id: 'layout',
        fallback: () => <div data-testid={'layout-fallback'}> </div>,
      })(({ children }: { children?: ReactNode }) => (
        <div data-testid={'layout'}>{children}</div>
      ));

      class ChildVM extends ViewModelBaseMock {}

      const Child = withViewModel(ChildVM, {
        fallback: () => <div data-testid={'child-fallback'}> </div>,
      })(() => <div data-testid={'child'} />);

      const App = () => {
        const [key, setKey] = useState(0);

        return (
          <div>
            <button
              data-testid={'click'}
              onClick={() => {
                console.info('button click');
                setKey(key + 1);
              }}
            >
              click
            </button>
            <Layout key={key}>
              <Child />
            </Layout>
          </div>
        );
      };

      const { container } = await act(async () =>
        render(<App />, { wrapper: createVMStoreWrapper(vmStore) }),
      );

      const button = screen.getByTestId('click');

      await act(async () => {
        fireEvent.click(button);
      });

      await expect(container.firstChild).toMatchFileSnapshot(
        `../../../../tests/snapshots/hooks/use-view-model/scenarios/${task.name}.html`,
      );
    });
  });

  test('shell withViewModel + child useViewModel(class) keeps a single VM when store updates during render', async () => {
    class RepositoryPageVM extends ViewModelBaseMock {}

    const RepositoryPage = observer(() => {
      const model = useViewModel(RepositoryPageVM);
      return <div data-testid="page">{model.id}</div>;
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

    const App = () => {
      const [tick, setTick] = useState(0);
      return (
        <div>
          <button
            data-testid="rerender"
            type="button"
            onClick={() => setTick((value) => value + 1)}
          >
            {tick}
          </button>
          <RepositoryShell>
            <RepositoryPage />
          </RepositoryShell>
        </div>
      );
    };

    render(<App />, { wrapper: createVMStoreWrapper(vmStore) });

    const page = screen.getByTestId('page');
    const initialId = page.textContent;

    await act(async () => {
      fireEvent.click(screen.getByTestId('rerender'));
      fireEvent.click(screen.getByTestId('rerender'));
      fireEvent.click(screen.getByTestId('rerender'));
    });

    expect(page.textContent).toBe(initialId);
    expect(vmStore.getIds(RepositoryPageVM)).toHaveLength(1);
    expect(vmStore._viewModels.size).toBe(1);
  });

  test('deferred registry: shell withViewModel + observer child keeps one VM when globals mutate during VM construction', async () => {
    const globals = observable({ tick: 0 });

    class RepositoryPageVM extends ViewModelBaseMock {
      constructor(params: ViewModelParams) {
        super(params);
        reaction(
          () => globals.tick,
          () => {
            globals.tick;
          },
          { fireImmediately: true },
        );
      }
    }

    const RepositoryPage = observer(() => {
      globals.tick;
      const model = useViewModel(RepositoryPageVM);
      return <div data-testid="page">{model.id}</div>;
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

    render(
      <RepositoryShell>
        <RepositoryPage />
      </RepositoryShell>,
      { wrapper: createVMStoreWrapper(vmStore) },
    );

    const page = screen.getByTestId('page');
    const initialId = page.textContent;

    await act(async () => {
      runInAction(() => {
        globals.tick++;
      });
      runInAction(() => {
        globals.tick++;
      });
    });

    expect(page.textContent).toBe(initialId);
    expect(vmStore.getIds(RepositoryPageVM)).toHaveLength(1);
    expect(vmStore._viewModels.size).toBe(1);
  });

  test('nested child withViewModel keeps single parent VM after navigation-style rerender', async () => {
    class RepositoryPageVM extends ViewModelBaseMock {}
    class MergeRequestsVM extends ViewModelBaseMock {}

    const MergeRequestsPage = withViewModel(
      MergeRequestsVM,
      observer(({ children }: { children?: ReactNode }) => (
        <div data-testid="mr-page">{children}</div>
      )),
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

    const App = ({ showMergeRequests }: { showMergeRequests: boolean }) => (
      <RepositoryShell>
        {showMergeRequests ? <MergeRequestsPage /> : null}
      </RepositoryShell>
    );

    const { rerender } = render(<App showMergeRequests={false} />, {
      wrapper: createVMStoreWrapper(vmStore),
    });

    await act(async () => {
      rerender(<App showMergeRequests={true} />);
      rerender(<App showMergeRequests={true} />);
    });

    expect(vmStore.getIds(RepositoryPageVM)).toHaveLength(1);
    expect(vmStore.getIds(MergeRequestsVM)).toHaveLength(1);
    expect(vmStore._viewModels.size).toBe(2);
  });
});
