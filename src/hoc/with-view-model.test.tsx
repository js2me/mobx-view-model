import { act, fireEvent, render, screen } from '@testing-library/react';
import { observer } from 'mobx-react-lite';
import { ReactNode, useState } from 'react';
import { describe, expect, test, vi } from 'vitest';

import { ViewModelStore, ViewModelStoreImpl, ViewModelsProvider } from '..';
import { createCounter } from '../utils';
import { TestViewModelImpl } from '../view-model/view-model.impl.test';

import { ViewModelProps, withViewModel } from './with-view-model';

const createIdGenerator = (prefix?: string) => {
  const counter = createCounter();
  return () => (prefix ?? '') + counter().toString();
};

describe('withViewModel', () => {
  test('renders', () => {
    class VM extends TestViewModelImpl {}
    const View = ({ model }: ViewModelProps<VM>) => {
      return <div>{`hello ${model.id}`}</div>;
    };
    const Component = withViewModel(VM, { generateId: createIdGenerator() })(
      View,
    );

    render(<Component />);
    expect(screen.getByText('hello VM_0')).toBeDefined();
  });

  test('renders nesting', () => {
    const Component1 = withViewModel(TestViewModelImpl)(({
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
    const Component2 = withViewModel(TestViewModelImpl)(() => {
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
    class VM extends TestViewModelImpl {}
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
    class VM extends TestViewModelImpl {}
    const View = ({ model }: ViewModelProps<VM>) => {
      return <div>{`hello ${model.id}`}</div>;
    };
    const Component = withViewModel(VM, { id: 'my-test' })(View);

    render(<Component />);
    expect(screen.getByText('hello my-test')).toBeDefined();
  });

  test('renders twice with fixed id', async () => {
    class VM extends TestViewModelImpl {}
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
    class VM extends TestViewModelImpl {}
    const View = vi.fn(({ model }: ViewModelProps<VM>) => {
      return <div>{`hello ${model.id}`}</div>;
    });
    const Component = withViewModel(VM, { generateId: createIdGenerator() })(
      View,
    );

    render(<Component />);
    expect(View).toHaveBeenCalledTimes(1);
  });

  test('withViewModel wrapper should by only mounted (renders only 1 time)', () => {
    class VM extends TestViewModelImpl {}
    const View = vi.fn(({ model }: ViewModelProps<VM>) => {
      return <div>{`hello ${model.id}`}</div>;
    });

    const useHookSpy = vi.fn(() => {});

    const Component = withViewModel(VM, {
      generateId: createIdGenerator(),
      reactHooks: useHookSpy, // the save renders count as withViewModel wrapper
    })(View);

    render(<Component />);
    expect(useHookSpy).toHaveBeenCalledTimes(1);
  });

  test('View should be updated when payload is changed', async () => {
    class VM extends TestViewModelImpl<{ counter: number }> {}
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
    let vm: TestViewModelImpl<{ counter: number }> | null;

    class VM extends TestViewModelImpl<{ counter: number }> {
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

  describe('with ViewModelStore', () => {
    test('renders', async () => {
      class VM extends TestViewModelImpl {}
      const View = observer(({ model }: ViewModelProps<VM>) => {
        return (
          <div>
            <div>{`hello my friend. Model id is ${model.id}`}</div>
          </div>
        );
      });
      const Component = withViewModel(VM, { generateId: () => '1' })(View);
      const vmStore = new ViewModelStoreImpl();

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

      class VM extends TestViewModelImpl {
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
      const vmStore = new ViewModelStoreImpl();

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
    });
  });
});
