import { render, screen } from '@solidjs/testing-library';
import { enableObservableTracking } from 'mobx-solid';
import { viewModelsConfig, type ViewModelStore } from 'mobx-view-model';
import { createSignal, type ParentComponent } from 'solid-js';
import { beforeAll, describe, expect, test, vi } from 'vitest';
import { ViewModelsProvider } from '../components/index.js';
import { withPropsViewModel, withViewModel } from '../hoc/index.js';
import { useCreateViewModel, useViewModel } from '../hooks/index.js';
import {
  CounterVM,
  ViewModelBaseMock,
  ViewModelStoreBaseMock,
} from '../lib/test-mocks.js';

beforeAll(() => {
  enableObservableTracking();
});

describe('useCreateViewModel', () => {
  const createVMStoreWrapper = (
    vmStore: ViewModelStore,
  ): ParentComponent => {
    return (props) => (
      <ViewModelsProvider value={vmStore}>{props.children}</ViewModelsProvider>
    );
  };

  test('creates ViewModel and updates UI on observable change', async () => {
    const vmStore = new ViewModelStoreBaseMock();

    const Counter = () => {
      const model = useCreateViewModel(CounterVM);
      return (
        <button type="button" onClick={() => model.increment()}>
          count:{model.count}
        </button>
      );
    };

    const Wrapper = createVMStoreWrapper(vmStore);
    render(() => (
      <Wrapper>
        <Counter />
      </Wrapper>
    ));

    const button = await screen.findByRole('button');
    expect(button.textContent).toBe('count:0');

    button.click();
    expect(button.textContent).toBe('count:1');
  });

  test('resolves vm.data from the store resource before the global resource', () => {
    const previousResource = viewModelsConfig.resource;
    const globalRead = vi.fn((id: string) => ({ id, value: 13 }));
    const storeRead = vi.fn((id: string) => ({ id, value: 42 }));
    viewModelsConfig.resource = { read: globalRead };

    try {
      const vmStore = new ViewModelStoreBaseMock({
        resource: { read: storeRead },
      });

      class ResourceVM extends ViewModelBaseMock {}

      const Component = () => {
        const model = useCreateViewModel(ResourceVM, undefined, {
          id: 'resource-vm',
        });
        return <span>{String((model.vm.data as { value: number }).value)}</span>;
      };

      const Wrapper = createVMStoreWrapper(vmStore);
      render(() => (
        <Wrapper>
          <Component />
        </Wrapper>
      ));

      expect(screen.getByText('42').textContent).toBe('42');
      expect(storeRead).toHaveBeenCalledWith('resource-vm');
      expect(globalRead).not.toHaveBeenCalled();
    } finally {
      viewModelsConfig.resource = previousResource;
    }
  });

  test('uses the global resource without a ViewModelStore', () => {
    const previousResource = viewModelsConfig.resource;
    const resource = {
      read: (id: string) => ({ id, value: 84 }),
    };
    viewModelsConfig.resource = resource;

    try {
      class ResourceVM extends ViewModelBaseMock {}

      const Component = () => {
        const model = useCreateViewModel(ResourceVM, undefined, {
          id: 'global-resource-vm',
        });
        return <span>{String((model.vm.data as { value: number }).value)}</span>;
      };

      render(() => <Component />);

      expect(screen.getByText('84').textContent).toBe('84');
    } finally {
      viewModelsConfig.resource = previousResource;
    }
  });

  test('useViewModel resolves active parent from withViewModel', async () => {
    const vmStore = new ViewModelStoreBaseMock();

    class FooVM extends ViewModelBaseMock {
      foo = 'foo';
    }

    const Child = () => {
      const foo = useViewModel(FooVM);
      return <span>child:{foo.foo}</span>;
    };

    const Parent = withViewModel(FooVM, () => (
      <div>
        <Child />
      </div>
    ));

    const Wrapper = createVMStoreWrapper(vmStore);
    render(() => (
      <Wrapper>
        <Parent />
      </Wrapper>
    ));

    expect((await screen.findByText(/child:foo/)).textContent).toBe(
      'child:foo',
    );
  });
});

describe('withViewModel', () => {
  test('renders model state', async () => {
    const vmStore = new ViewModelStoreBaseMock();

    class LabelVM extends ViewModelBaseMock {
      label = 'hello';
    }

    const Label = withViewModel(LabelVM, (props) => (
      <span>{props.model.label}</span>
    ));

    render(() => (
      <ViewModelsProvider value={vmStore}>
        <Label />
      </ViewModelsProvider>
    ));

    expect((await screen.findByText('hello')).textContent).toBe('hello');
  });
});

describe('withPropsViewModel', () => {
  test('updates a simple VM payload when a prop changes', async () => {
    const received: string[] = [];

    class SimpleVM {
      setPayload(payload: { label: string }) {
        received.push(payload.label);
      }
    }

    const Label = withPropsViewModel(SimpleVM, ({ label }) => (
      <span>{label}</span>
    ));
    const [label, setLabel] = createSignal('first');

    render(() => <Label label={label()} />);
    expect(received).toEqual(['first']);

    setLabel('second');
    await Promise.resolve();
    expect(received).toContain('second');
  });
});
