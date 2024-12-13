import { act, fireEvent, render, screen } from '@testing-library/react';
import { ReactNode, useState } from 'react';
import { beforeEach, describe, expect, test } from 'vitest';

import { ViewModelStore, ViewModelsProvider } from '..';
import { withViewModel } from '../hoc';
import { TestViewModelStoreImpl } from '../view-model/abstract-view-model.store.test';
import { TestViewModelImpl } from '../view-model/view-model.impl.test';

import { useViewModel } from './use-view-model';

describe('withViewModel', () => {
  let counter = 0;

  const generateId = () => {
    return (counter++).toString();
  };

  beforeEach(() => {
    counter = 0;
  });

  const createDepthComponent = (
    depth: number,
    { accessUsing }: { accessUsing: 'generic' | 'class-ref' | 'id' },
  ) => {
    class VM1 extends TestViewModelImpl {
      depth = `${depth}`;
    }
    return withViewModel(VM1, {
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
            model = useViewModel(VM1);

            break;
          }
          case 'id': {
            model = useViewModel<VM1>(`depth-${depth}`);

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
  };

  const createVMStoreWrapper = (vmStore: ViewModelStore) => {
    return ({ children }: { children?: ReactNode }) => {
      return (
        <ViewModelsProvider value={vmStore}>{children}</ViewModelsProvider>
      );
    };
  };

  const createTests = (
    accessUsing: 'generic' | 'class-ref' | 'id',
    withVmStore?: boolean,
  ) => {
    const createDepthTest = (depth: number) => {
      const depthsComponents = Array.from({ length: depth })
        .fill(null)
        .map((_, i) => {
          const componentDepth = i + 1;
          return createDepthComponent(componentDepth, { accessUsing });
        });

      test(`renders (${depth} depth)`, async () => {
        const vmStore = new TestViewModelStoreImpl();

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

        expect(container.firstChild).toMatchFileSnapshot(
          `../../tests/snapshots/hooks/use-view-model/access-using-${accessUsing}/${withVmStore ? 'with-view-model-store/' : ''}${depth}-depth.html`,
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

  describe('access using generic', () => {
    createTests('generic');
  });
  describe('access using class reference', () => {
    createTests('class-ref');
  });
  describe('access using view model id', () => {
    createTests('id');
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
  });

  describe('scenarios', () => {
    test('container renders VM with fixed id and some child with dynamic id', async ({
      task,
    }) => {
      const vmStore = new TestViewModelStoreImpl();

      class LayoutVM extends TestViewModelImpl {}

      const Layout = withViewModel(LayoutVM, {
        id: 'layout',
      })(({ children }: { children?: ReactNode }) => (
        <div data-testid={'layout'}>{children}</div>
      ));

      class ChildVM extends TestViewModelImpl {}

      const Child = withViewModel(ChildVM)(() => (
        <div data-testid={'child'}></div>
      ));

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

      expect(container.firstChild).toMatchFileSnapshot(
        `../../tests/snapshots/hooks/use-view-model/scenarios/${task.name}.html`,
      );
    });
    test('container remounts VM with fixed id and some child with dynamic id', async ({
      task,
    }) => {
      const vmStore = new TestViewModelStoreImpl();

      class LayoutVM extends TestViewModelImpl {}

      const Layout = withViewModel(LayoutVM, {
        id: 'layout',
        fallback: () => <div data-testid={'layout-fallback'}> </div>,
      })(({ children }: { children?: ReactNode }) => (
        <div data-testid={'layout'}>{children}</div>
      ));

      class ChildVM extends TestViewModelImpl {}

      const Child = withViewModel(ChildVM, {
        fallback: () => <div data-testid={'child-fallback'}> </div>,
      })(() => <div data-testid={'child'}></div>);

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

      expect(container.firstChild).toMatchFileSnapshot(
        `../../tests/snapshots/hooks/use-view-model/scenarios/${task.name}.html`,
      );
    });
  });
});
