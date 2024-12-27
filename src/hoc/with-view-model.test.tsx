import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { observer } from 'mobx-react-lite';
import { PropsWithChildren, ReactNode, useEffect, useState } from 'react';
import { describe, expect, test, vi } from 'vitest';

import { ViewModelStore, ViewModelsProvider } from '..';
import { createCounter } from '../utils';
import { EmptyObject } from '../utils/types';
import { ViewModelMock } from '../view-model/view-model.impl.test';
import { ViewModelStoreMock } from '../view-model/view-model.store.impl.test';

import { ViewModelProps, withViewModel } from './with-view-model';

const createIdGenerator = (prefix?: string) => {
  const counter = createCounter();
  return () => (prefix ?? '') + counter().toString();
};

describe('withViewModel', () => {
  test('renders', async () => {
    class VM extends ViewModelMock {
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
    class VM extends ViewModelMock {
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
    class VM extends ViewModelMock {
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
    class VM extends ViewModelMock {}
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
    const Component1 = withViewModel(ViewModelMock)(({
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
    const Component2 = withViewModel(ViewModelMock)(() => {
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
    class VM extends ViewModelMock {}
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
    class VM extends ViewModelMock {}
    const View = ({ model }: ViewModelProps<VM>) => {
      return <div>{`hello ${model.id}`}</div>;
    };
    const Component = withViewModel(VM, { id: 'my-test' })(View);

    render(<Component />);
    expect(screen.getByText('hello my-test')).toBeDefined();
  });

  test('renders twice with fixed id', async () => {
    class VM extends ViewModelMock {}
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
    class VM extends ViewModelMock {}
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
    class VM extends ViewModelMock {}
    const View = vi.fn(({ model }: ViewModelProps<VM>) => {
      return <div>{`hello ${model.id}`}</div>;
    });

    const useHookSpy = vi.fn(() => {});

    const Component = withViewModel(VM, {
      generateId: createIdGenerator(),
      reactHooks: useHookSpy, // the save renders count as withViewModel wrapper
    })(View);

    render(<Component />);
    expect(useHookSpy).toHaveBeenCalledTimes(2);
  });

  test('View should be updated when payload is changed', async () => {
    class VM extends ViewModelMock<{ counter: number }> {}
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

  test('View should have actual payload state', async () => {
    let vm: ViewModelMock<{ counter: number }> | null;

    class VM extends ViewModelMock<{ counter: number }> {
      constructor(...args: any[]) {
        super(...args);
        vm = this;
      }
    }

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

    // @ts-ignore
    expect(vm?.payload).toEqual({ counter: 3 });
  });

  test('access to parent view model x3', async ({ task, expect }) => {
    class VM1 extends ViewModelMock {
      vm1Value = 'foo';
    }
    const Component1 = withViewModel(VM1)(({
      children,
      model,
    }: PropsWithChildren & ViewModelProps<VM1>) => {
      return <div data-testid={`vm-${model.vm1Value}`}>{children}</div>;
    });

    class VM2 extends ViewModelMock<EmptyObject, VM1> {
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

    class VM3 extends ViewModelMock<EmptyObject, VM2> {
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

    expect(container.firstChild).toMatchFileSnapshot(
      `../../tests/snapshots/hoc/with-view-model/${task.name}.html`,
    );
  });

  describe('with ViewModelStore', () => {
    test('renders', async () => {
      class VM extends ViewModelMock {}
      const View = observer(({ model }: ViewModelProps<VM>) => {
        return (
          <div>
            <div>{`hello my friend. Model id is ${model.id}`}</div>
          </div>
        );
      });
      const Component = withViewModel(VM, { generateId: () => '1' })(View);
      const vmStore = new ViewModelStoreMock();

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

      class VM extends ViewModelMock {
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
      const vmStore = new ViewModelStoreMock();

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
      expect(vmStore.spies.get).toHaveBeenCalledTimes(3);
      expect(vmStore._instanceAttachedCount.size).toBe(1);
      expect(vmStore._unmountingViews.size).toBe(0);
      expect(vmStore.mountedViewsCount).toBe(1);
      expect(vmStore._mountingViews.size).toBe(0);
    });

    test('access to parent view model x3', async ({ task }) => {
      const vmStore = new ViewModelStoreMock();

      const Wrapper = ({ children }: { children?: ReactNode }) => {
        return (
          <ViewModelsProvider value={vmStore}>{children}</ViewModelsProvider>
        );
      };

      class VM1 extends ViewModelMock {
        vm1Value = 'foo';
      }
      const Component1 = withViewModel(VM1)(({
        children,
        model,
      }: PropsWithChildren & ViewModelProps<VM1>) => {
        return <div data-testid={`vm-${model.vm1Value}`}>{children}</div>;
      });

      class VM2 extends ViewModelMock<EmptyObject, VM1> {
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

      class VM3 extends ViewModelMock<EmptyObject, VM2> {
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

      expect(container.firstChild).toMatchFileSnapshot(
        `../../tests/snapshots/hoc/with-view-model/view-model-store/${task.name}.html`,
      );
      expect(vmStore.spies.get).toHaveBeenCalledTimes(15);
      expect(vmStore._instanceAttachedCount.size).toBe(3);
      expect(vmStore._unmountingViews.size).toBe(0);
      expect(vmStore.mountedViewsCount).toBe(3);
      expect(vmStore._mountingViews.size).toBe(0);
    });

    test('access to child view model through VM in the middle (Parent -> Middle -> Child)', async ({
      task,
      expect,
    }) => {
      const vmStore = new ViewModelStoreMock();

      const Wrapper = ({ children }: { children?: ReactNode }) => {
        return (
          <ViewModelsProvider value={vmStore}>{children}</ViewModelsProvider>
        );
      };

      class ChildVM extends ViewModelMock<EmptyObject, MiddleVM> {
        value = 'value-from-child';
      }
      const Child = withViewModel(ChildVM)(({
        children,
        model,
      }: PropsWithChildren & ViewModelProps<ChildVM>) => {
        return (
          <div data-testid={'child'}>
            <label>{model.value}</label>
            {children}
          </div>
        );
      });

      class ParentVM extends ViewModelMock {
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

      class MiddleVM extends ViewModelMock<EmptyObject, ParentVM> {
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

      expect(container).toMatchFileSnapshot(
        `../../tests/snapshots/hoc/with-view-model/view-model-store/${task.name}.html`,
      );
    });
  });
});
