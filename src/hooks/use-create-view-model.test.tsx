import { act, render } from '@testing-library/react';
import { ReactNode } from 'react';
import { describe, expect, test } from 'vitest';

import {
  ViewModelStore,
  ViewModelsProvider,
  useCreateViewModel,
  useViewModel,
} from '../index.js';
import { ViewModelBaseMock } from '../view-model/view-model.base.test.js';
import { ViewModelStoreBaseMock } from '../view-model/view-model.store.base.test.js';

describe('useCreateViewModel', () => {
  const createVMStoreWrapper = (vmStore: ViewModelStore) => {
    return ({ children }: { children?: ReactNode }) => {
      return (
        <ViewModelsProvider value={vmStore}>{children}</ViewModelsProvider>
      );
    };
  };

  describe('scenarios', () => {
    test('accessing to the previous VM', async ({ task }) => {
      const vmStore = new ViewModelStoreBaseMock();

      class FooVM extends ViewModelBaseMock {
        foo = 'foo';
      }
      class BarVM extends ViewModelBaseMock {
        bar = 'bar';

        get fooData() {
          return this.viewModels.get(FooVM)?.foo + this.bar;
        }
      }

      const A = () => {
        const foo = useCreateViewModel(FooVM);
        const bar = useCreateViewModel(BarVM);

        return `${foo.foo}${bar.bar} - ${bar.fooData}`;
      };

      const App = () => {
        return (
          <div>
            <A />
          </div>
        );
      };

      const { container } = await act(async () =>
        render(<App />, { wrapper: createVMStoreWrapper(vmStore) }),
      );

      await expect(container.firstChild).toMatchFileSnapshot(
        `../../tests/snapshots/hooks/use-create-view-model/scenarios/${task.name}.html`,
      );
    });
    test('accessing to the parent VM', async ({ task }) => {
      const vmStore = new ViewModelStoreBaseMock();

      class FooVM extends ViewModelBaseMock {
        foo = 'foo';
      }
      class BarVM extends ViewModelBaseMock {
        bar = 'bar';

        get fooData() {
          return this.viewModels.get(FooVM)?.foo + this.bar;
        }
      }

      const B = () => {
        const foo = useViewModel(FooVM);
        const bar = useCreateViewModel(BarVM);

        return `${foo.foo}, ${bar.bar} - ${bar.fooData}`;
      };

      const A = () => {
        const foo = useCreateViewModel(FooVM);

        return (
          <>
            {`A component with foo: "${foo.foo}"`}
            <B />
          </>
        );
      };

      const App = () => {
        return (
          <div>
            <A />
          </div>
        );
      };

      const { container } = await act(async () =>
        render(<App />, { wrapper: createVMStoreWrapper(vmStore) }),
      );

      await expect(container.firstChild).toMatchFileSnapshot(
        `../../tests/snapshots/hooks/use-create-view-model/scenarios/${task.name}.html`,
      );
    });
  });
});
