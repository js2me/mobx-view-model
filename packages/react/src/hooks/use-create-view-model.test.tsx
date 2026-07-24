import { act, render, screen } from '@testing-library/react';
import { describe, expect, expectTypeOf, test, vi } from 'vitest';
import type { AnyObject, Maybe, PartialKeys } from 'yummies/types';
import type { ViewModelSimple, ViewModelStore } from 'mobx-view-model';
import { viewModelsConfig } from 'mobx-view-model';
import type { ReactNode } from 'react';
import { Suspense } from 'react';
import { renderToReadableStream } from 'react-dom/server';
import { ViewModelBaseMock } from '../../../core/src/view-model/view-model.base.test.js';
import { ViewModelStoreBaseMock } from '../../../core/src/view-model/view-model.store.base.test.js';
import { ViewModelsProvider } from '../components/index.js';
import { useCreateViewModel, useViewModel } from '../hooks/index.js';

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
        `../../../../tests/snapshots/hooks/use-create-view-model/scenarios/${task.name}.html`,
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
        `../../../../tests/snapshots/hooks/use-create-view-model/scenarios/${task.name}.html`,
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
        `../../../../tests/snapshots/hooks/use-create-view-model/ViewModelSimple/${task.name}.html`,
      );
    });

    test('ViewModelSimple with setPayload: single call on first CSR render (no render+layout duplicate)', async () => {
      const setPayloadSpy = vi.fn();

      class SimpleWithPayload implements ViewModelSimple<{ n: number }> {
        id = 'with-payload';

        setPayload(payload: { n: number }): void {
          setPayloadSpy(payload);
        }
      }

      const A = ({ n }: { n: number }) => {
        const vm = useCreateViewModel(SimpleWithPayload, { n });
        expectTypeOf(vm).toEqualTypeOf<SimpleWithPayload>();
        return null;
      };

      const InvalidPayload = () => {
        // @ts-expect-error payload.n must be a number
        useCreateViewModel(SimpleWithPayload, { n: '1' });
        return null;
      };

      expect(InvalidPayload).toBeTypeOf('function');

      const { rerender } = await act(async () => render(<A n={1} />));

      expect(setPayloadSpy).toHaveBeenCalledTimes(1);
      expect(setPayloadSpy).toHaveBeenCalledWith({ n: 1 });

      await act(async () => rerender(<A n={2} />));

      expect(setPayloadSpy).toHaveBeenCalledTimes(2);
      expect(setPayloadSpy).toHaveBeenLastCalledWith({ n: 2 });
    });

    test('ViewModelSimple with literal payload type: useCreateViewModel accepts typed item', () => {
      type Foo = PartialKeys<
        {
          optionalA?: string;
          id: number;
          optionalB?: AnyObject[];
          requiredA: string;
          optionalC?: string;
          requiredB: string;
          requiredC: string;
          optionalD?: string;
          requiredD: string;
        },
        'requiredA' | 'requiredB' | 'requiredD'
      >;

      class TestSimpleVM implements ViewModelSimple<Foo> {
        private item: Maybe<Foo>;

        setPayload(payload: Foo): void {
          if (payload !== this.item) {
            this.item = payload;
          }
        }
      }

      const assertTypes = (item: Foo) => {
        const model = useCreateViewModel(TestSimpleVM, item);
        expectTypeOf(model).toEqualTypeOf<TestSimpleVM>();
        return model;
      };

      expect(assertTypes).toBeTypeOf('function');
    });

    test('should call "init"', async () => {
      const vmStore = new ViewModelStoreBaseMock();
      const initSpy = vi.fn();

      class SimpleFoo implements ViewModelSimple {
        id = 'foo';
        bar = 'bar';

        init(config: { viewModels?: ViewModelStore }): void {
          initSpy(config.viewModels);
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

      expect(initSpy).toHaveBeenCalledTimes(1);
      expect(initSpy).toHaveBeenCalledWith(vmStore);
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

    describe('ViewModelSimple without id', () => {
      test('should create instance', async ({ task }) => {
        const vmStore = new ViewModelStoreBaseMock();

        class SimpleFoo {
          bar = 'bar';
        }

        const A = () => {
          const foo = useCreateViewModel(SimpleFoo);

          return ` - ${foo.bar}`;
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
          `../../../../tests/snapshots/hooks/use-create-view-model/ViewModelSimple/without-id/${task.name}.html`,
        );
      });

      test('should call "init"', async () => {
        const vmStore = new ViewModelStoreBaseMock();
        const initSpy = vi.fn();

        class SimpleFoo implements ViewModelSimple {
          bar = 'bar';

          init(config: { viewModels?: ViewModelStore }): void {
            initSpy(config.viewModels);
          }
        }

        const A = () => {
          const foo = useCreateViewModel(SimpleFoo);

          return ` - ${foo.bar}`;
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

        expect(initSpy).toHaveBeenCalledTimes(1);
        expect(initSpy).toHaveBeenCalledWith(vmStore);
      });

      test('should call "mount()"', async () => {
        const vmStore = new ViewModelStoreBaseMock();
        const mountSpy = vi.fn();

        class SimpleFoo implements ViewModelSimple {
          bar = 'bar';

          mount(): void {
            mountSpy();
          }
        }

        const A = () => {
          const foo = useCreateViewModel(SimpleFoo);

          return ` - ${foo.bar}`;
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
          bar = 'bar';

          unmount(): void {
            unmountSpy();
          }
        }

        const A = () => {
          const foo = useCreateViewModel(SimpleFoo);

          return ` - ${foo.bar}`;
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

});
