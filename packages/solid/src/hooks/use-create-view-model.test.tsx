import { render, screen } from '@solidjs/testing-library';
import { enableObservableTracking } from 'mobx-solid';
import type { ViewModelStore } from 'mobx-view-model';
import type { ParentComponent } from 'solid-js';
import { beforeAll, describe, expect, test } from 'vitest';
import { ViewModelsProvider } from '../components/index.js';
import { withViewModel } from '../hoc/index.js';
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
