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

  /**
   * Regression: a `viewModels.has(id)` guard must not skip the second `attach` when another
   * hook reuses the same store instance — otherwise `detach` underflows and the VM unmounts
   * while a sibling is still mounted.
   */
  describe('shared store instance (per-hook attach, not id/store membership)', () => {
    test('two consumers with the same id: refcount 2 → 1 → 0, mount path once', async () => {
      const vmStore = new ViewModelStoreBaseMock();
      const sharedId = 'shared-refcount-vm';

      class SharedVM extends ViewModelBaseMock {}

      const Consumer = ({ label }: { label: string }) => {
        const vm = useCreateViewModel(SharedVM, {}, { id: sharedId });
        return <span data-testid={label}>{vm.id}</span>;
      };

      const App = ({ showSecond }: { showSecond: boolean }) => (
        <div>
          <Consumer label="a" />
          {showSecond ? <Consumer label="b" /> : null}
        </div>
      );

      const { rerender, unmount } = await act(async () =>
        render(<App showSecond />, {
          wrapper: createVMStoreWrapper(vmStore),
        }),
      );

      const shared = vmStore.get<ViewModelBaseMock>(sharedId);
      expect(shared).toBeTruthy();
      expect(vmStore._instanceAttachedCount.get(sharedId)).toBe(2);
      expect(shared!.spies.willMount).toHaveBeenCalledTimes(1);

      await act(async () => rerender(<App showSecond={false} />));

      expect(vmStore._instanceAttachedCount.get(sharedId)).toBe(1);
      expect(vmStore.get(sharedId)).toBe(shared);

      await act(async () => {
        unmount();
      });

      expect(vmStore._instanceAttachedCount.get(sharedId)).toBeUndefined();
      expect(vmStore.get(sharedId)).toBe(null);
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

      test('should call "attachViewModelStore"', async () => {
        const vmStore = new ViewModelStoreBaseMock();
        const attachViewModelStoreSpy = vi.fn();

        class SimpleFoo implements ViewModelSimple {
          bar = 'bar';

          attachViewModelStore(viewModels: ViewModelStore): void {
            attachViewModelStoreSpy(viewModels);
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

        expect(attachViewModelStoreSpy).toHaveBeenCalledTimes(1);
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

  describe('useReactIds', () => {
    test('uses config.vmConfig.useReactIds when it is defined', async () => {
      const prev = viewModelsConfig.useReactIds;
      viewModelsConfig.useReactIds = false;

      try {
        const vmStore = new ViewModelStoreBaseMock({
          vmConfig: { useReactIds: false },
        });

        class Vm extends ViewModelBaseMock {}

        let id = '';
        const A = () => {
          const vm = useCreateViewModel(Vm, {}, { vmConfig: { useReactIds: true } });
          id = vm.id;
          return <span data-testid="id">{vm.id}</span>;
        };

        await act(async () =>
          render(<A />, { wrapper: createVMStoreWrapper(vmStore) }),
        );

        expect(id).toMatch(/_r_/);
        expect(screen.getByTestId('id').textContent).toBe(id);
      } finally {
        viewModelsConfig.useReactIds = prev;
      }
    });

    test('uses viewModels.vmConfig.useReactIds when config.vmConfig.useReactIds is undefined', async () => {
      const prev = viewModelsConfig.useReactIds;
      viewModelsConfig.useReactIds = false;

      try {
        const vmStore = new ViewModelStoreBaseMock({
          vmConfig: { useReactIds: true },
        });

        class Vm extends ViewModelBaseMock {}

        let id = '';
        const A = () => {
          const vm = useCreateViewModel(Vm, {});
          id = vm.id;
          return null;
        };

        await act(async () =>
          render(<A />, { wrapper: createVMStoreWrapper(vmStore) }),
        );

        expect(id).toMatch(/_r_/);
      } finally {
        viewModelsConfig.useReactIds = prev;
      }
    });

    test('uses global viewModelsConfig.useReactIds when config and store are absent', async () => {
      const prev = viewModelsConfig.useReactIds;
      viewModelsConfig.useReactIds = true;

      try {
        class Vm extends ViewModelBaseMock {}

        let id = '';
        const A = () => {
          const vm = useCreateViewModel(Vm, {});
          id = vm.id;
          return null;
        };

        await act(async () => render(<A />));

        expect(id).toMatch(/_r_/);
      } finally {
        viewModelsConfig.useReactIds = prev;
      }
    });
  });

  describe('suspendUntil', () => {
    test('ViewModelBase: uses config.vmConfig.suspendUntil and passes instance', async () => {
      const suspendUntil = vi.fn(() => Promise.resolve());
      const vmStore = new ViewModelStoreBaseMock();

      class Vm extends ViewModelBaseMock {}

      const A = () => {
        useCreateViewModel(Vm, {}, { vmConfig: { suspendUntil } });
        return null;
      };

      await act(async () =>
        render(
          <Suspense fallback={null}>
            <A />
          </Suspense>,
          { wrapper: createVMStoreWrapper(vmStore) },
        ),
      );

      expect(suspendUntil).toHaveBeenCalled();
      for (const call of suspendUntil.mock.calls as unknown[][]) {
        expect(call[0]).toBeInstanceOf(Vm);
      }
    });

    test('ViewModelBase: config.vmConfig.suspendUntil overrides store vmConfig', async () => {
      const storeFn = vi.fn(() => Promise.resolve());
      const configFn = vi.fn(() => Promise.resolve());
      const vmStore = new ViewModelStoreBaseMock({
        vmConfig: { suspendUntil: storeFn },
      });

      class Vm extends ViewModelBaseMock {}

      const A = () => {
        useCreateViewModel(Vm, {}, { vmConfig: { suspendUntil: configFn } });
        return null;
      };

      await act(async () =>
        render(
          <Suspense fallback={null}>
            <A />
          </Suspense>,
          { wrapper: createVMStoreWrapper(vmStore) },
        ),
      );

      expect(configFn).toHaveBeenCalled();
      expect(storeFn).not.toHaveBeenCalled();
    });

    test('ViewModelBase: uses viewModels.vmConfig.suspendUntil when hook vmConfig omits it', async () => {
      const suspendUntil = vi.fn(() => Promise.resolve());
      const prev = viewModelsConfig.suspendUntil;
      viewModelsConfig.suspendUntil = undefined;

      try {
        const vmStore = new ViewModelStoreBaseMock({
          vmConfig: { suspendUntil },
        });

        class Vm extends ViewModelBaseMock {}

        const A = () => {
          useCreateViewModel(Vm, {});
          return null;
        };

        await act(async () =>
          render(
            <Suspense fallback={null}>
              <A />
            </Suspense>,
            { wrapper: createVMStoreWrapper(vmStore) },
          ),
        );

        expect(suspendUntil).toHaveBeenCalled();
        for (const call of suspendUntil.mock.calls as unknown[][]) {
          expect(call[0]).toBeInstanceOf(Vm);
        }
      } finally {
        viewModelsConfig.suspendUntil = prev;
      }
    });

    test('ViewModelBase: uses global viewModelsConfig.suspendUntil when store omits it', async () => {
      const suspendUntil = vi.fn(() => Promise.resolve());
      const prev = viewModelsConfig.suspendUntil;
      viewModelsConfig.suspendUntil = suspendUntil;

      try {
        class Vm extends ViewModelBaseMock {}

        const A = () => {
          useCreateViewModel(Vm, {});
          return null;
        };

        await act(async () =>
          render(
            <Suspense fallback={null}>
              <A />
            </Suspense>,
          ),
        );

        expect(suspendUntil).toHaveBeenCalled();
        for (const call of suspendUntil.mock.calls as unknown[][]) {
          expect(call[0]).toBeInstanceOf(Vm);
        }
      } finally {
        viewModelsConfig.suspendUntil = prev;
      }
    });

    test('ViewModelSimple: uses viewModels.vmConfig.suspendUntil', async () => {
      const suspendUntil = vi.fn(() => Promise.resolve());
      const vmStore = new ViewModelStoreBaseMock({
        vmConfig: { suspendUntil },
      });

      class SimpleVm implements ViewModelSimple {
        id = 'simple-suspend';
        bar = 'bar';
      }

      const A = () => {
        useCreateViewModel(SimpleVm);
        return null;
      };

      await act(async () =>
        render(
          <Suspense fallback={null}>
            <A />
          </Suspense>,
          { wrapper: createVMStoreWrapper(vmStore) },
        ),
      );

      expect(suspendUntil).toHaveBeenCalled();
      for (const call of suspendUntil.mock.calls as unknown[][]) {
        expect(call[0]).toBeInstanceOf(SimpleVm);
      }
    });

    describe('SSR', () => {
      const readableStreamToHtml = async (stream: ReadableStream<Uint8Array>) => {
        const reader = stream.getReader();
        const decoder = new TextDecoder();
        let html = '';
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              break;
            }
            html += decoder.decode(value, { stream: true });
          }
          html += decoder.decode();
        } finally {
          reader.releaseLock();
        }
        return html;
      };

      const renderOnServer = async (node: ReactNode) => {
        vi.stubGlobal('window', undefined);
        try {
          const stream = await renderToReadableStream(<>{node}</>);
          return readableStreamToHtml(stream);
        } finally {
          vi.unstubAllGlobals();
        }
      };

      test('server stream invokes suspendUntil and includes the view markup', async () => {
        const ready = Promise.resolve();
        const suspendUntil = vi.fn(() => ready);
        const vmStore = new ViewModelStoreBaseMock();

        class Vm extends ViewModelBaseMock {}

        const Page = () => {
          const vm = useCreateViewModel(Vm, {}, {
            vmConfig: { suspendUntil },
          });
          return <span data-testid="ssr-out">{vm.id}</span>;
        };

        const html = await renderOnServer(
          <Suspense fallback={<span data-testid="ssr-fb">loading</span>}>
            <ViewModelsProvider value={vmStore}>
              <Page />
            </ViewModelsProvider>
          </Suspense>,
        );

        expect(suspendUntil).toHaveBeenCalled();
        expect(html).toContain('data-testid="ssr-out"');
        expect(html).not.toContain('data-testid="ssr-fb"');
      });
    });

    describe('CSR', () => {
      test('client render resolves suspendUntil and shows the view', async () => {
        const ready = Promise.resolve();
        const suspendUntil = vi.fn(() => ready);
        const vmStore = new ViewModelStoreBaseMock();

        class Vm extends ViewModelBaseMock {}

        const Page = () => {
          const vm = useCreateViewModel(Vm, {}, {
            vmConfig: { suspendUntil },
          });
          return <span data-testid="csr-out">{vm.id}</span>;
        };

        await act(async () =>
          render(
            <Suspense fallback={<span data-testid="csr-fb">loading</span>}>
              <ViewModelsProvider value={vmStore}>
                <Page />
              </ViewModelsProvider>
            </Suspense>,
          ),
        );

        expect(suspendUntil).toHaveBeenCalled();
        expect(screen.getByTestId('csr-out').textContent).toMatch(/.+/);
        expect(screen.queryByTestId('csr-fb')).toBeNull();
      });
    });
  });
});
