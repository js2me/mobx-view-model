/* eslint-disable sonarjs/label-has-associated-control */
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { comparer, makeObservable, observable, runInAction } from 'mobx';
import { observer } from 'mobx-react-lite';
import {
  ComponentType,
  PropsWithChildren,
  ReactNode,
  useEffect,
  useState,
  version,
} from 'react';
import { describe, expect, it, test, vi } from 'vitest';
import { sleep } from 'yummies/async';
import { createCounter } from 'yummies/complex';

import {
  ViewModelParams,
  ViewModelStore,
  ViewModelsProvider,
  ViewModelsRawConfig,
} from '../index.js';
import { AnyObject, EmptyObject, Maybe } from '../utils/types.js';
import { ViewModelBaseMock } from '../view-model/view-model.base.test.js';
import { ViewModelStoreBaseMock } from '../view-model/view-model.store.base.test.js';

import { ViewModelProps, withViewModel } from './with-view-model.js';
import {
  CircularVmPayloadDependencyTestCase,
  circularVmPayloadDependencyTestCases,
} from './with-view-model.test.fixture.js';

const createIdGenerator = (prefix?: string) =>
  createCounter((counter) => `${prefix ?? ''}${counter}`);

const createVMStoreWrapper = (vmStore: ViewModelStore) => {
  return ({ children }: { children?: ReactNode }) => {
    return <ViewModelsProvider value={vmStore}>{children}</ViewModelsProvider>;
  };
};

function getBasedReactVersion<T>(values: { 18: T; 19: T }): T {
  const reactMajorVersion = +version.split('.')[0] as 19;
  return values[reactMajorVersion] ?? values[18];
}

describe('withViewModel', () => {
  test('renders', async () => {
    class VM extends ViewModelBaseMock {
      mount() {
        super.mount();
      }
    }
    const View = ({ model }: ViewModelProps<VM>) => {
      return <div data-testid={'view'}>{`hello ${model.id}`}</div>;
    };
    const Component = withViewModel(VM, { generateId: createIdGenerator() })(
      View,
    );

    await act(async () => render(<Component />));
    expect(screen.getByText('hello VM_0')).toBeDefined();
  });

  test('renders fallback', async () => {
    class VM extends ViewModelBaseMock {
      // eslint-disable-next-line sonarjs/no-empty-function
      mount() {}
    }
    const View = ({ model }: ViewModelProps<VM>) => {
      return <div data-testid={'view'}>{`hello ${model.id}`}</div>;
    };
    const Component = withViewModel(VM, {
      generateId: createIdGenerator(),
      fallback: () => {
        return 'fallback';
      },
    })(View);

    const { container } = await act(async () => render(<Component />));
    expect(container).toMatchInlineSnapshot(`
      <div>
        fallback
      </div>
    `);
  });

  test('renders fallback (times)', async () => {
    class VM extends ViewModelBaseMock {
      // eslint-disable-next-line sonarjs/no-empty-function
      mount() {}
    }
    const View = ({ model }: ViewModelProps<VM>) => {
      return <div data-testid={'view'}>{`hello ${model.id}`}</div>;
    };

    const spyFallbackRender = vi.fn(() => 'fallback');

    const Component = withViewModel(VM, {
      generateId: createIdGenerator(),
      fallback: spyFallbackRender,
    })(View);

    await act(async () => render(<Component />));
    expect(spyFallbackRender).toHaveBeenCalledTimes(1);
  });

  test('renders fallback before render REAL COMPONENT (times)', async () => {
    class VM extends ViewModelBaseMock {}
    const View = ({ model }: ViewModelProps<VM>) => {
      return <div data-testid={'view'}>{`hello ${model.id}`}</div>;
    };

    const spyFallbackRender = vi.fn(() => 'fallback');

    const Component = withViewModel(VM, {
      generateId: createIdGenerator(),
      fallback: spyFallbackRender,
    })(View);

    await act(async () => render(<Component />));

    expect(spyFallbackRender).toHaveBeenCalledTimes(1);
  });

  test('renders nesting', () => {
    const Component1 = withViewModel(ViewModelBaseMock)(({
      children,
    }: {
      children?: ReactNode;
    }) => {
      return (
        <div data-testid={'parent-container'}>
          <div>parent</div>
          {children}
        </div>
      );
    });
    const Component2 = withViewModel(ViewModelBaseMock)(() => {
      return <div>child</div>;
    });

    const { container } = render(
      <Component1>
        <Component2 />
      </Component1>,
    );

    expect(container.firstChild).toMatchInlineSnapshot(`
      <div
        data-testid="parent-container"
      >
        <div>
          parent
        </div>
        <div>
          child
        </div>
      </div>
    `);
  });

  test('renders twice', async () => {
    class VM extends ViewModelBaseMock {}
    const View = ({ model }: ViewModelProps<VM>) => {
      return <div>{`hello ${model.id}`}</div>;
    };
    const Component = withViewModel(VM, { generateId: createIdGenerator() })(
      View,
    );

    render(
      <>
        <Component />
        <Component />
      </>,
    );
    expect(screen.getByText('hello VM_0')).toBeDefined();
    expect(screen.getByText('hello VM_1')).toBeDefined();
  });

  test('renders with fixed id', () => {
    class VM extends ViewModelBaseMock {}
    const View = ({ model }: ViewModelProps<VM>) => {
      return <div>{`hello ${model.id}`}</div>;
    };
    const Component = withViewModel(VM, { id: 'my-test' })(View);

    render(<Component />);
    expect(screen.getByText('hello my-test')).toBeDefined();
  });

  test('renders twice with fixed id', async () => {
    class VM extends ViewModelBaseMock {}
    const View = ({ model }: ViewModelProps<VM>) => {
      return <div>{`hello ${model.id}`}</div>;
    };
    const Component = withViewModel(VM, { id: 'my-test' })(View);

    render(
      <>
        <Component />
        <Component />
      </>,
    );
    expect(await screen.findAllByText('hello my-test')).toHaveLength(2);
  });

  test('View should be only mounted (renders only 1 time)', () => {
    class VM extends ViewModelBaseMock {}
    const View = vi.fn(({ model }: ViewModelProps<VM>) => {
      return <div>{`hello ${model.id}`}</div>;
    });
    const Component = withViewModel(VM, { generateId: createIdGenerator() })(
      View,
    );

    render(<Component />);
    expect(View).toHaveBeenCalledTimes(1);
  });

  test('withViewModel wrapper should by only mounted (renders 2 times)', () => {
    class VM extends ViewModelBaseMock {}
    const View = vi.fn(({ model }: ViewModelProps<VM>) => {
      return <div>{`hello ${model.id}`}</div>;
    });

    const useHookSpy = vi.fn(() => {});

    const Component = withViewModel(VM, {
      generateId: createIdGenerator(),
      reactHook: useHookSpy, // the save renders count as withViewModel wrapper
    })(View);

    render(<Component />);
    expect(useHookSpy).toHaveBeenCalledTimes(2);
  });

  describe('payload manipulations', () => {
    test('View should be updated when payload is changed', async () => {
      class VM extends ViewModelBaseMock<{ counter: number }> {}
      const View = vi.fn(({ model }: ViewModelProps<VM>) => {
        return <div>{`hello ${model.id}`}</div>;
      });
      const Component = withViewModel(VM, { generateId: createIdGenerator() })(
        View,
      );

      const SuperContainer = () => {
        const [counter, setCounter] = useState(0);

        return (
          <>
            <button
              data-testid={'increment'}
              onClick={() => setCounter(counter + 1)}
            >
              increment
            </button>
            <Component payload={{ counter }} />
          </>
        );
      };

      await act(() => render(<SuperContainer />));

      const incrementButton = screen.getByTestId('increment');

      fireEvent.click(incrementButton);
      fireEvent.click(incrementButton);
      fireEvent.click(incrementButton);

      expect(View).toHaveBeenCalledTimes(4);
    });

    const createTestPayloadChanges = async ({
      vmConfig,
      wrapViewInObserver,
      renderPayloadInView,
      expectedCounterInPayload,
      expectedRerendersCountInVMComponentView,
    }: {
      vmConfig?: ViewModelsRawConfig;
      wrapViewInObserver?: boolean;
      renderPayloadInView?: boolean;
      expectedCounterInPayload: number;
      expectedRerendersCountInVMComponentView: number;
    }) => {
      let vm: ViewModelBaseMock<{ counter: number }> | null;

      class VM extends ViewModelBaseMock<{ counter: number }> {
        constructor(...args: any[]) {
          super(...args);
          vm = this;
        }
      }

      const vmConnectedComponentViewRenderSpy = vi.fn();

      let VMConnectedComponentView: ComponentType<ViewModelProps<VM>> = ({
        model,
      }: ViewModelProps<VM>) => {
        vmConnectedComponentViewRenderSpy();
        return renderPayloadInView ? (
          <div>{`hello ${model.id} ${model.payload.counter}`}</div>
        ) : (
          <div>{`hello ${model.id}`}</div>
        );
      };

      if (wrapViewInObserver) {
        VMConnectedComponentView = observer(VMConnectedComponentView);
      }

      const Component = withViewModel(VM, {
        generateId: createIdGenerator(),
        vmConfig,
      })(VMConnectedComponentView);

      const SuperContainer = () => {
        const [counter, setCounter] = useState(0);
        // eslint-disable-next-line sonarjs/hook-use-state
        const [, forceUpdate] = useState({});

        return (
          <>
            <button
              data-testid={'increment'}
              onClick={() => {
                setCounter(counter + 1);
              }}
            >
              increment
            </button>
            <button
              data-testid={'forceUpdate'}
              onClick={() => {
                forceUpdate({});
              }}
            >
              forceUpdate
            </button>
            <Component payload={{ counter }} />
          </>
        );
      };

      await act(() => render(<SuperContainer />));

      const incrementButton = screen.getByTestId('increment');
      const forceUpdateButton = screen.getByTestId('forceUpdate');

      fireEvent.click(incrementButton);
      fireEvent.click(incrementButton);
      fireEvent.click(incrementButton);

      // @ts-ignore
      expect(vm?.payload).toEqual({ counter: expectedCounterInPayload });

      fireEvent.click(forceUpdateButton);
      fireEvent.click(forceUpdateButton);
      fireEvent.click(forceUpdateButton);

      expect(vmConnectedComponentViewRenderSpy).toHaveBeenCalledTimes(
        expectedRerendersCountInVMComponentView,
      );
    };

    test('View should have actual payload state (default isPayloadEqual)', async () => {
      await createTestPayloadChanges({
        expectedCounterInPayload: 3,
        expectedRerendersCountInVMComponentView: 7,
      });
    });

    test('View should have actual payload state (default isPayloadEqual + observer view wrap())', async () => {
      await createTestPayloadChanges({
        expectedCounterInPayload: 3,
        expectedRerendersCountInVMComponentView: 1,
        wrapViewInObserver: true,
      });
    });

    test('View should have actual payload state (default isPayloadEqual + observer view wrap() + render payload in view)', async () => {
      await createTestPayloadChanges({
        expectedCounterInPayload: 3,
        expectedRerendersCountInVMComponentView: getBasedReactVersion({
          18: 4,
          19: 7,
        }),
        wrapViewInObserver: true,
        renderPayloadInView: true,
      });
    });

    test('View should have actual payload state (comparePayload: strict)', async () => {
      await createTestPayloadChanges({
        vmConfig: { comparePayload: 'strict' },
        expectedCounterInPayload: 3,
        expectedRerendersCountInVMComponentView: 7,
      });
    });

    test('View should have actual payload state (comparePayload: strict + observer view wrap())', async () => {
      await createTestPayloadChanges({
        vmConfig: { comparePayload: 'strict' },
        expectedCounterInPayload: 3,
        expectedRerendersCountInVMComponentView: 1,
        wrapViewInObserver: true,
      });
    });

    test('View should have actual payload state (comparePayload: strict + observer view wrap() + render payload in view)', async () => {
      await createTestPayloadChanges({
        vmConfig: { comparePayload: 'strict' },
        expectedCounterInPayload: 3,
        expectedRerendersCountInVMComponentView: getBasedReactVersion({
          18: 4,
          19: 7,
        }),
        wrapViewInObserver: true,
        renderPayloadInView: true,
      });
    });

    test('View should have actual payload state (comparePayload: shallow)', async () => {
      await createTestPayloadChanges({
        vmConfig: { comparePayload: 'shallow' },
        expectedCounterInPayload: 3,
        expectedRerendersCountInVMComponentView: 7,
      });
    });

    test('View should have actual payload state (comparePayload: shallow + observer view wrap())', async () => {
      await createTestPayloadChanges({
        vmConfig: { comparePayload: 'shallow' },
        expectedCounterInPayload: 3,
        expectedRerendersCountInVMComponentView: 1,
        wrapViewInObserver: true,
      });
    });

    test('View should have actual payload state (comparePayload: shallow + observer view wrap() + render payload in view)', async () => {
      await createTestPayloadChanges({
        vmConfig: { comparePayload: 'shallow' },
        expectedCounterInPayload: 3,
        expectedRerendersCountInVMComponentView: getBasedReactVersion({
          18: 4,
          19: 7,
        }),
        wrapViewInObserver: true,
        renderPayloadInView: true,
      });
    });

    test('View should have actual payload state (comparePayload: false)', async () => {
      await createTestPayloadChanges({
        vmConfig: { comparePayload: false },
        expectedCounterInPayload: 3,
        expectedRerendersCountInVMComponentView: 7,
      });
    });

    test('View should have actual payload state (comparePayload: false + observer view wrap())', async () => {
      await createTestPayloadChanges({
        vmConfig: { comparePayload: false },
        expectedCounterInPayload: 3,
        expectedRerendersCountInVMComponentView: 1,
        wrapViewInObserver: true,
      });
    });

    test('View should have actual payload state (comparePayload: false + observer view wrap() + render payload in view)', async () => {
      await createTestPayloadChanges({
        vmConfig: { comparePayload: false },
        expectedCounterInPayload: 3,
        expectedRerendersCountInVMComponentView: getBasedReactVersion({
          18: 7,
          19: 13,
        }),
        wrapViewInObserver: true,
        renderPayloadInView: true,
      });
    });

    test('View should have actual payload state (comparePayload: comparer.shallow)', async () => {
      await createTestPayloadChanges({
        vmConfig: { comparePayload: comparer.shallow },
        expectedCounterInPayload: 3,
        expectedRerendersCountInVMComponentView: 7,
      });
    });

    test('View should have actual payload state (comparePayload: comparer.shallow + observer view wrap())', async () => {
      await createTestPayloadChanges({
        vmConfig: { comparePayload: comparer.shallow },
        expectedCounterInPayload: 3,
        expectedRerendersCountInVMComponentView: 1,
        wrapViewInObserver: true,
      });
    });

    test('View should have actual payload state (comparePayload: comparer.shallow + observer view wrap() + render payload in view)', async () => {
      await createTestPayloadChanges({
        vmConfig: { comparePayload: comparer.shallow },
        expectedCounterInPayload: 3,
        expectedRerendersCountInVMComponentView: getBasedReactVersion({
          18: 4,
          19: 7,
        }),
        wrapViewInObserver: true,
        renderPayloadInView: true,
      });
    });

    test('View should have actual payload state (comparePayload: comparer.structural)', async () => {
      await createTestPayloadChanges({
        vmConfig: { comparePayload: comparer.structural },
        expectedCounterInPayload: 3,
        expectedRerendersCountInVMComponentView: 7,
      });
    });

    test('View should have actual payload state (comparePayload: comparer.structural + observer view wrap())', async () => {
      await createTestPayloadChanges({
        vmConfig: { comparePayload: comparer.structural },
        expectedCounterInPayload: 3,
        expectedRerendersCountInVMComponentView: 1,
        wrapViewInObserver: true,
      });
    });

    test('View should have actual payload state (comparePayload: comparer.structural + observer view wrap() + render payload in view)', async () => {
      await createTestPayloadChanges({
        vmConfig: { comparePayload: comparer.structural },
        expectedCounterInPayload: 3,
        expectedRerendersCountInVMComponentView: getBasedReactVersion({
          18: 4,
          19: 7,
        }),
        wrapViewInObserver: true,
        renderPayloadInView: true,
      });
    });

    test('View should have actual payload state (comparePayload: comparer.identity)', async () => {
      await createTestPayloadChanges({
        vmConfig: { comparePayload: comparer.identity },
        expectedCounterInPayload: 3,
        expectedRerendersCountInVMComponentView: 7,
      });
    });

    test('View should have actual payload state (comparePayload: comparer.identity + observer view wrap())', async () => {
      await createTestPayloadChanges({
        vmConfig: { comparePayload: comparer.identity },
        expectedCounterInPayload: 3,
        expectedRerendersCountInVMComponentView: 1,
        wrapViewInObserver: true,
      });
    });

    test('View should have actual payload state (comparePayload: comparer.identity + observer view wrap() + render payload in view)', async () => {
      await createTestPayloadChanges({
        vmConfig: { comparePayload: comparer.identity },
        expectedCounterInPayload: 3,
        expectedRerendersCountInVMComponentView: getBasedReactVersion({
          18: 7,
          19: 13,
        }),
        wrapViewInObserver: true,
        renderPayloadInView: true,
      });
    });

    test('View should have actual payload state (comparePayload: comparer.default)', async () => {
      await createTestPayloadChanges({
        vmConfig: { comparePayload: comparer.default },
        expectedCounterInPayload: 3,
        expectedRerendersCountInVMComponentView: 7,
      });
    });

    test('View should have actual payload state (comparePayload: comparer.default + observer view wrap())', async () => {
      await createTestPayloadChanges({
        vmConfig: { comparePayload: comparer.default },
        expectedCounterInPayload: 3,
        expectedRerendersCountInVMComponentView: 1,
        wrapViewInObserver: true,
      });
    });

    test('View should have actual payload state (comparePayload: comparer.default + observer view wrap() + render payload in view)', async () => {
      await createTestPayloadChanges({
        vmConfig: { comparePayload: comparer.default },
        expectedCounterInPayload: 3,
        expectedRerendersCountInVMComponentView: getBasedReactVersion({
          18: 7,
          19: 13,
        }),
        wrapViewInObserver: true,
        renderPayloadInView: true,
      });
    });

    test('getting update for payload from parent view model (shallow equal)', async () => {
      const setPayloadSpy = vi.fn();
      class ChildVM extends ViewModelBaseMock<any, any> {
        setPayload(payload: any): void {
          setPayloadSpy(payload);
          super.setPayload(payload);
        }
      }

      const ChildView = withViewModel(ChildVM, {
        vmConfig: {
          comparePayload: 'shallow',
        },
      })(
        observer(({ model }: ViewModelProps<ChildVM>) => {
          return (
            <div>
              1{model.payload?.selectedCompIds?.join(',')}
              {`${model.payload?.techreviewId}`}
            </div>
          );
        }),
      );
      class ParentVM extends ViewModelBaseMock {
        @observable.ref
        private comp_ids: Maybe<string[]> = null;

        get techreviewId() {
          return '1';
        }

        get selectedCompIds() {
          return this.comp_ids || [];
        }

        mount(): void {
          super.mount();

          runInAction(() => {
            this.comp_ids = ['1', '2', '3'];
          });
        }
      }

      const ParentView = withViewModel(ParentVM, {
        vmConfig: {
          comparePayload: 'shallow',
        },
      })(
        observer(({ model }: ViewModelProps<ParentVM>) => {
          return (
            <div>
              <ChildView
                payload={{
                  techreviewId: model.techreviewId,
                  displayOnlySelectedCompIds: true,
                  selectedCompIds: model.selectedCompIds,
                }}
              />
            </div>
          );
        }),
      );

      const App = () => {
        return (
          <>
            <ParentView />
          </>
        );
      };

      const app = <App />;
      const screen = await act(() => render(app));
      screen.rerender(app);

      await sleep(200);

      expect(setPayloadSpy).toHaveBeenCalledTimes(2);
    });
  });

  test('access to parent view model x3', async ({ task, expect }) => {
    class VM1 extends ViewModelBaseMock {
      vm1Value = 'foo';
    }
    const Component1 = withViewModel(VM1)(({
      children,
      model,
    }: PropsWithChildren & ViewModelProps<VM1>) => {
      return <div data-testid={`vm-${model.vm1Value}`}>{children}</div>;
    });

    class VM2 extends ViewModelBaseMock<EmptyObject, VM1> {
      vm2Value = 'bar';
    }
    const Component2 = withViewModel(VM2)(({
      children,
      model,
    }: PropsWithChildren & ViewModelProps<VM2>) => {
      return (
        <div
          data-testid={`vm-${model.vm2Value}-${model.parentViewModel.vm1Value}`}
        >
          {children}
        </div>
      );
    });

    class VM3 extends ViewModelBaseMock<EmptyObject, VM2> {
      vm3Value = 'baz';
    }
    const Component3 = withViewModel(VM3)(({
      children,
      model,
    }: PropsWithChildren & ViewModelProps<VM3>) => {
      return (
        <div
          data-testid={`vm-${model.vm3Value}-${model.parentViewModel.vm2Value}`}
        >
          {children}
        </div>
      );
    });

    const { container } = await act(async () =>
      render(
        <Component1>
          <Component2>
            <Component3 />
          </Component2>
        </Component1>,
      ),
    );

    await expect(container.firstChild).toMatchFileSnapshot(
      `../../tests/snapshots/hoc/with-view-model/${task.name}.html`,
    );
  });

  describe('with ViewModelStore', () => {
    test('renders', async () => {
      class VM extends ViewModelBaseMock {}
      const View = observer(({ model }: ViewModelProps<VM>) => {
        return (
          <div>
            <div>{`hello my friend. Model id is ${model.id}`}</div>
          </div>
        );
      });
      const Component = withViewModel(VM, { generateId: () => '1' })(View);
      const vmStore = new ViewModelStoreBaseMock();

      const Wrapper = ({ children }: { children?: ReactNode }) => {
        return (
          <ViewModelsProvider value={vmStore}>{children}</ViewModelsProvider>
        );
      };

      await act(async () =>
        render(<Component />, {
          wrapper: Wrapper,
        }),
      );

      expect(
        screen.getByText('hello my friend. Model id is VM_1'),
      ).toBeDefined();
    });

    test('able to get access to view model store', async () => {
      let viewModels: ViewModelStore = null as any;

      class VM extends ViewModelBaseMock {
        constructor(params: any) {
          super(params);
          viewModels = params.viewModels;
        }
      }
      const View = observer(({ model }: ViewModelProps<VM>) => {
        return (
          <div>
            <div>{`hello my friend. Model id is ${model.id}`}</div>
          </div>
        );
      });
      const Component = withViewModel(VM, { generateId: () => '1' })(View);
      const vmStore = new ViewModelStoreBaseMock();

      const Wrapper = ({ children }: { children?: ReactNode }) => {
        return (
          <ViewModelsProvider value={vmStore}>{children}</ViewModelsProvider>
        );
      };

      await act(async () =>
        render(<Component />, {
          wrapper: Wrapper,
        }),
      );

      expect(viewModels).toBeDefined();
      expect(vmStore.spies.get).toHaveBeenCalledTimes(1);
      expect(vmStore._instanceAttachedCount.size).toBe(1);
      expect(vmStore._unmountingViews.size).toBe(0);
      expect(vmStore.mountedViewsCount).toBe(1);
      expect(vmStore._mountingViews.size).toBe(0);
    });

    test('access to parent view model x3', async ({ task }) => {
      const vmStore = new ViewModelStoreBaseMock();

      const Wrapper = ({ children }: { children?: ReactNode }) => {
        return (
          <ViewModelsProvider value={vmStore}>{children}</ViewModelsProvider>
        );
      };

      class VM1 extends ViewModelBaseMock {
        vm1Value = 'foo';
      }
      const Component1 = withViewModel(VM1)(({
        children,
        model,
      }: PropsWithChildren & ViewModelProps<VM1>) => {
        return <div data-testid={`vm-${model.vm1Value}`}>{children}</div>;
      });

      class VM2 extends ViewModelBaseMock<EmptyObject, VM1> {
        vm2Value = 'bar';
      }
      const Component2 = withViewModel(VM2)(({
        children,
        model,
      }: PropsWithChildren & ViewModelProps<VM2>) => {
        return (
          <div
            data-testid={`vm-${model.vm2Value}-${model.parentViewModel.vm1Value}`}
          >
            {children}
          </div>
        );
      });

      class VM3 extends ViewModelBaseMock<EmptyObject, VM2> {
        vm3Value = 'baz';
      }
      const Component3 = withViewModel(VM3)(({
        children,
        model,
      }: PropsWithChildren & ViewModelProps<VM3>) => {
        return (
          <div
            data-testid={`vm-${model.vm3Value}-${model.parentViewModel.vm2Value}`}
          >
            {children}
          </div>
        );
      });

      const { container } = await act(async () =>
        render(
          <Component1>
            <Component2>
              <Component3 />
            </Component2>
          </Component1>,
          {
            wrapper: Wrapper,
          },
        ),
      );

      await expect(container.firstChild).toMatchFileSnapshot(
        `../../tests/snapshots/hoc/with-view-model/view-model-store/${task.name}.html`,
      );
      expect(vmStore.spies.get).toHaveBeenCalledTimes(3);
      expect(vmStore._instanceAttachedCount.size).toBe(3);
      expect(vmStore._unmountingViews.size).toBe(0);
      expect(vmStore.mountedViewsCount).toBe(3);
      expect(vmStore._mountingViews.size).toBe(0);
    });

    test('access to child view model through VM in the middle (Parent -> Middle -> Child) (using useEffect + setState)', async ({
      task,
      expect,
    }) => {
      const vmStore = new ViewModelStoreBaseMock();

      const Wrapper = ({ children }: { children?: ReactNode }) => {
        return (
          <ViewModelsProvider value={vmStore}>{children}</ViewModelsProvider>
        );
      };

      class ChildVM extends ViewModelBaseMock<EmptyObject, MiddleVM> {
        value = 'value-from-child';
      }
      const Child = withViewModel(ChildVM, {
        id: 'child',
      })(({ children, model }: PropsWithChildren & ViewModelProps<ChildVM>) => {
        return (
          <div data-testid={'child'}>
            <label>{model.value}</label>
            {children}
          </div>
        );
      });

      class ParentVM extends ViewModelBaseMock {
        value = 'value-from-parent';

        get child() {
          return vmStore.get(Child);
        }

        get childValue() {
          return this.child?.value;
        }
      }
      const Parent = withViewModel(ParentVM)(({
        children,
        model,
      }: PropsWithChildren & ViewModelProps<ParentVM>) => {
        return (
          <div data-testid={'parent'}>
            <label>
              {model.value}
              {`and this is child value: "${model.childValue}"`}
            </label>
            {children}
            {model.child?.id}
          </div>
        );
      });

      class MiddleVM extends ViewModelBaseMock<EmptyObject, ParentVM> {
        value = 'value-from-middle';
      }
      const Middle = withViewModel(MiddleVM)(({
        model,
      }: PropsWithChildren & ViewModelProps<MiddleVM>) => {
        const [showChild, setShowChild] = useState(false);

        useEffect(() => {
          setTimeout(() => {
            setShowChild(true);
          }, 400);
        }, []);

        return (
          <div data-testid={'middle'}>
            <label>{model.value}</label>
            {showChild && <Child />}
          </div>
        );
      });

      const { container } = await act(async () =>
        render(
          <Parent>
            <Middle />
          </Parent>,
          {
            wrapper: Wrapper,
          },
        ),
      );

      await waitFor(async () => {
        await screen.findByTestId('child');
      });

      await expect(container).toMatchFileSnapshot(
        `../../tests/snapshots/hoc/with-view-model/view-model-store/${task.name}.html`,
      );
    });

    test('access to child view model through VM in the middle (Parent -> Middle -> Child) (using observable values)', async ({
      task,
      expect,
    }) => {
      const vmStore = new ViewModelStoreBaseMock();

      const Wrapper = ({ children }: { children?: ReactNode }) => {
        return (
          <ViewModelsProvider value={vmStore}>{children}</ViewModelsProvider>
        );
      };

      class ChildVM extends ViewModelBaseMock<EmptyObject, MiddleVM> {
        value = 'value-from-child';
      }
      const Child = withViewModel(ChildVM, {
        id: 'child',
      })(
        observer(
          ({
            children,
            model,
          }: PropsWithChildren & ViewModelProps<ChildVM>) => {
            return (
              <div data-testid={'child'}>
                <label>{model.value}</label>
                {children}
              </div>
            );
          },
        ),
      );

      class ParentVM extends ViewModelBaseMock {
        value = 'value-from-parent';

        get child() {
          return vmStore.get(Child);
        }

        get childValue() {
          return this.child?.value;
        }
      }
      const Parent = withViewModel(ParentVM)(
        observer(
          ({
            children,
            model,
          }: PropsWithChildren & ViewModelProps<ParentVM>) => {
            return (
              <div data-testid={'parent'}>
                <label>
                  {model.value}
                  {`and this is child value: "${model.childValue}"`}
                </label>
                {children}
                {model.child?.id}
              </div>
            );
          },
        ),
      );

      class MiddleVM extends ViewModelBaseMock<EmptyObject, ParentVM> {
        value = 'value-from-middle';

        showChild: boolean;

        constructor(params?: Partial<ViewModelParams<EmptyObject, ParentVM>>) {
          super(params);
          this.showChild = false;
          observable(this, 'showChild');
          makeObservable(this);
        }

        mount() {
          super.mount();
          setTimeout(() => {
            runInAction(() => {
              this.showChild = true;
            });
          }, 400);
        }
      }
      const Middle = withViewModel(MiddleVM)(
        observer(({ model }: PropsWithChildren & ViewModelProps<MiddleVM>) => {
          return (
            <div data-testid={'middle'}>
              <label>{model.value}</label>
              {model.showChild && <Child />}
            </div>
          );
        }),
      );

      const { container } = await act(async () =>
        render(
          <Parent>
            <Middle />
          </Parent>,
          {
            wrapper: Wrapper,
          },
        ),
      );

      await waitFor(async () => {
        await screen.findByTestId('child');
      });

      await expect(container).toMatchFileSnapshot(
        `../../tests/snapshots/hoc/with-view-model/view-model-store/${task.name}.html`,
      );
    });

    test('endless rerenders bug', async () => {
      const vmStore = new ViewModelStoreBaseMock({
        vmConfig: {
          comparePayload: false,
          payloadObservable: 'deep',
        },
      });

      let renderParentCount = -1;
      let renderChildCount = -1;
      class ParentVM extends ViewModelBaseMock {
        get payloadParam1() {
          return {};
        }

        get payloadParam2() {
          return {};
        }

        get payloadParam3() {
          return 10;
        }

        get payloadParam4() {
          return [];
        }
      }
      class ChildVM extends ViewModelBaseMock<{
        payloadParam1: AnyObject;
        payloadParam2: AnyObject;
        payloadParam3: number;
        payloadParam4: any[];
      }> {}

      const Child = withViewModel(ChildVM)(({ model }) => {
        renderChildCount++;
        return (
          <div>
            <label>{JSON.stringify(model.payload.payloadParam1)}</label>
            <label>{JSON.stringify(model.payload.payloadParam2)}</label>
            <label>{model.payload.payloadParam3}</label>
          </div>
        );
      });

      const Parent = withViewModel(ParentVM)(({ model }) => {
        renderParentCount++;
        return (
          <div>
            <Child
              payload={{
                payloadParam1: model.payloadParam1,
                payloadParam2: model.payloadParam2,
                payloadParam3: model.payloadParam3,
                payloadParam4: model.payloadParam4,
              }}
            />
          </div>
        );
      });

      await act(async () =>
        render(<Parent />, {
          wrapper: createVMStoreWrapper(vmStore),
        }),
      );

      expect(renderParentCount).toBe(2);
      expect(renderChildCount).toBe(0);
    });
  });

  describe('circular vm payload dependency using access to child payload from parent vm with using vm store', () => {
    const createTest = async ({
      vmConfig,
      isRecursion,
    }: CircularVmPayloadDependencyTestCase) => {
      const caseNameTitle = `${isRecursion ? 'bad' : 'ok'} scenario`;
      const caseNameSegments: string[] = [];

      if (vmConfig.comparePayload != null) {
        caseNameSegments.push(`comparePayload: ${vmConfig.comparePayload}`);
      }

      if (vmConfig.payloadObservable != null) {
        caseNameSegments.push(
          `payloadObservable: ${vmConfig.payloadObservable}`,
        );
      }

      if (vmConfig.payloadComputed != null) {
        caseNameSegments.push(`payloadComputed: ${vmConfig.payloadComputed}`);
      }

      const caseName = `${caseNameTitle} (${caseNameSegments.join(', ')})`;

      it(caseName, async () => {
        vi.useFakeTimers();

        class ChildVM extends ViewModelBaseMock<{
          fruitId: Maybe<string>;
          teabugIds: Maybe<string[]>;
          showTeabugs: boolean;
        }> {
          @observable
          error: string = '';

          @observable
          payloadChangeCounter = 0;
          maxPaylodChangeCount = 50;

          @observable
          timeExpected = false;

          setPayload(payload: {
            fruitId: Maybe<string>;
            teabugIds: Maybe<string[]>;
            showTeabugs: boolean;
          }): void {
            this.payloadChangeCounter++;
            if (this.payloadChangeCounter > this.maxPaylodChangeCount) {
              this.error = `set payload too many times (${this.maxPaylodChangeCount}+)`;
              return;
            }
            super.setPayload(payload);
          }

          async mount() {
            super.mount();

            await sleep(200);
            runInAction(() => {
              this.timeExpected = true;
            });
          }
        }

        const ChildView = observer(
          ({
            model,
            getFruitObject,
            getTeabugObject,
          }: ViewModelProps<ChildVM> & {
            getFruitObject: (fruitId: string) => { label: string };
            getTeabugObject: (teabugId: string) => { label: string };
          }) => {
            return (
              <div
                data-testid={'child'}
                style={{
                  border: `1px solid ${model.error ? 'red' : 'green'}`,
                  color: model.error ? 'red' : 'green',
                  padding: 10,
                }}
              >
                {model.timeExpected && (
                  <div data-testid={'time-expected'}>
                    {`async time expected (payload change count: ${model.payloadChangeCounter})`}
                  </div>
                )}
                {model.error ? (
                  <div>error: {model.error}</div>
                ) : (
                  <>
                    <div>id: {model.id}</div>
                    {!!model.payload.fruitId && (
                      <div>
                        fruit from parent{' '}
                        {getFruitObject(model.payload.fruitId).label}
                      </div>
                    )}
                    {model.payload.showTeabugs &&
                      !!model.payload.teabugIds?.length && (
                        <div>
                          <label>teabugs from parent:</label>
                          <div>
                            {model.payload.teabugIds
                              .map((id) => getTeabugObject(id).label)
                              .join(',')}
                          </div>
                        </div>
                      )}
                  </>
                )}
              </div>
            );
          },
        );

        const Child = withViewModel(ChildVM)(ChildView);

        class ParentVM extends ViewModelBaseMock {
          @observable.ref
          fruitId: Maybe<string> = undefined;

          @observable.ref
          teabugIds: Maybe<string[]> = [];

          get childVM() {
            return this.viewModels.get(ChildVM);
          }

          get childHasFruit() {
            return !!this.childVM?.payload.fruitId;
          }

          mount(): void {
            super.mount();

            makeObservable(this);
            runInAction(() => {
              this.fruitId = '1';
            });

            runInAction(() => {
              this.teabugIds = ['1', '2', '3'];
            });
          }
        }

        const ParentView = observer(({ model }: ViewModelProps<ParentVM>) => {
          return (
            <div>
              <div>id: {model.id}</div>
              <div>{model.fruitId}</div>
              <div>{model.teabugIds?.join(',')}</div>
              {model.childHasFruit && <div>child has fruit</div>}
              <Child
                getFruitObject={(fruitId) => ({ label: fruitId })}
                getTeabugObject={(teabugId) => ({ label: teabugId })}
                payload={{
                  fruitId: model.fruitId,
                  teabugIds: model.teabugIds,
                  showTeabugs: true,
                }}
              />
            </div>
          );
        });

        const Parent = withViewModel(ParentVM)(ParentView);

        const TestPage = () => {
          return (
            <div>
              TestPage
              <Parent />
            </div>
          );
        };

        let i = 0;

        const vmStore = new ViewModelStoreBaseMock({
          vmConfig: {
            ...vmConfig,
            generateId: () => {
              return `${i++}`;
            },
          },
        });

        const { findByTestId } = render(<TestPage />, {
          wrapper: createVMStoreWrapper(vmStore),
        });

        await vi.runAllTimersAsync();

        vi.useRealTimers();

        const childElement = await findByTestId('child');

        if (isRecursion) {
          expect(childElement.style.color).toBe('red');
        } else {
          expect(childElement.style.color).toBe('green');
        }
      });
    };

    circularVmPayloadDependencyTestCases.forEach(createTest);
  });
});
