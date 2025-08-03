import { act, render } from '@testing-library/react';
import { ReactNode } from 'react';
import { describe, expect, test, vi } from 'vitest';

import {
  ViewModelSimple,
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

  describe('ViewModelSimple', () => {
    test('should create instance', async ({ task }) => {
      const vmStore = new ViewModelStoreBaseMock();

      class SimpleFoo implements ViewModelSimple {
        id = 'foo';
        bar = 'bar';
      }

      const A = () => {
        const foo = useCreateViewModel(SimpleFoo);

        return `${foo.id} - ${foo.bar}`;
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
        `../../tests/snapshots/hooks/use-create-view-model/ViewModelSimple/${task.name}.html`,
      );
    });

    test('should call "attachViewModelStore"', async () => {
      const vmStore = new ViewModelStoreBaseMock();
      const attachViewModelStoreSpy = vi.fn();

      class SimpleFoo implements ViewModelSimple {
        id = 'foo';
        bar = 'bar';

        attachViewModelStore(viewModels: ViewModelStore): void {
          attachViewModelStoreSpy(viewModels);
        }
      }

      const A = () => {
        const foo = useCreateViewModel(SimpleFoo);

        return `${foo.id} - ${foo.bar}`;
      };

      const App = () => {
        return (
          <div>
            <A />
          </div>
        );
      };

      await act(async () =>
        render(<App />, { wrapper: createVMStoreWrapper(vmStore) }),
      );

      expect(attachViewModelStoreSpy).toHaveBeenCalledTimes(1);
    });

    test('should call "mount()"', async () => {
      const vmStore = new ViewModelStoreBaseMock();
      const mountSpy = vi.fn();

      class SimpleFoo implements ViewModelSimple {
        id = 'foo';
        bar = 'bar';

        mount(): void {
          mountSpy();
        }
      }

      const A = () => {
        const foo = useCreateViewModel(SimpleFoo);

        return `${foo.id} - ${foo.bar}`;
      };

      const App = () => {
        return (
          <div>
            <A />
          </div>
        );
      };

      await act(async () =>
        render(<App />, { wrapper: createVMStoreWrapper(vmStore) }),
      );

      expect(mountSpy).toHaveBeenCalledTimes(1);
    });

    test('should call "unmount()"', async () => {
      const vmStore = new ViewModelStoreBaseMock();
      const unmountSpy = vi.fn();

      class SimpleFoo implements ViewModelSimple {
        id = 'foo';
        bar = 'bar';

        unmount(): void {
          unmountSpy();
        }
      }

      const A = () => {
        const foo = useCreateViewModel(SimpleFoo);

        return `${foo.id} - ${foo.bar}`;
      };

      const App = () => {
        return (
          <div>
            <A />
          </div>
        );
      };

      const it = await act(async () =>
        render(<App />, { wrapper: createVMStoreWrapper(vmStore) }),
      );

      it.unmount();

      expect(unmountSpy).toHaveBeenCalledTimes(1);
    });
  });
});
