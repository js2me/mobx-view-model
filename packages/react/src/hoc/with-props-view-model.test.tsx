import { act, cleanup, render } from '@testing-library/react';
import { ViewModelBase, type ViewModelSimple } from 'mobx-view-model';
import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import type { ComponentType } from 'react';
import { useRef } from 'react';
import type * as React from 'react';
import { ViewModelBaseMock } from '../../../core/src/view-model/view-model.base.test.js';
import { ViewModelStoreBaseMock } from '../../../core/src/view-model/view-model.store.base.test.js';
import { ViewModelsProvider } from '../components/index.js';
import { type ViewModelProps, withViewModel } from './with-view-model.js';
import { withPropsViewModel } from './with-props-view-model.js';

describe('withPropsViewModel', () => {
  describe('props as payload', () => {
    it('maps every prop into model.payload on mount', async () => {
      interface ComponentProps {
        foo: number;
        bar: string;
      }

      let payloadOnMount: ComponentProps | undefined;

      class YourVM extends ViewModelBaseMock<ComponentProps> {
        protected willMount(): void {
          payloadOnMount = { ...this.payload };
        }
      }

      const YourComponent = withPropsViewModel(YourVM, ({ model }) => {
        return (
          <div>
            {model.payload.foo}-{model.payload.bar}
          </div>
        );
      });

      const screen = await act(async () =>
        render(<YourComponent foo={1} bar="x" />),
      );

      expect(screen.getByText('1-x')).toBeDefined();
      expect(payloadOnMount).toEqual({ foo: 1, bar: 'x' });
    });

    it('updates model.payload when component props change', async () => {
      interface ComponentProps {
        count: number;
      }

      class CounterVM extends ViewModelBaseMock<ComponentProps> {}

      const vmStore = new ViewModelStoreBaseMock();

      const Counter = withPropsViewModel(
        CounterVM,
        ({ model }) => <div>{`count ${model.payload.count}`}</div>,
        { id: 'counter-vm' },
      );

      const screen = await act(async () =>
        render(
          <ViewModelsProvider value={vmStore}>
            <Counter count={1} />
          </ViewModelsProvider>,
        ),
      );

      const vm = vmStore.get('counter-vm') as CounterVM;

      expect(screen.getByText('count 1')).toBeDefined();
      expect(vm.payload.count).toBe(1);

      await act(async () => {
        screen.rerender(
          <ViewModelsProvider value={vmStore}>
            <Counter count={2} />
          </ViewModelsProvider>,
        );
      });

      expect(screen.getByText('count 2')).toBeDefined();
      expect(vm.payload.count).toBe(2);
    });


    it('passes the same flat props to the view and into model.payload', async () => {
      interface Payload {
        label: string;
        visible: boolean;
      }

      class LabelVM extends ViewModelBase<Payload> {}

      interface ComponentProps extends ViewModelProps<LabelVM> {}

      const receivedPayloads: Payload[] = [];

      const Label = withPropsViewModel(
        LabelVM,
        ({ model }: ComponentProps) => {
          receivedPayloads.push(model.payload);
          return (
            <div>
              {model.payload.label}-{String(model.payload.visible)}
            </div>
          );
        },
      );

      const screen = await act(async () =>
        render(<Label label="from-props" visible />),
      );

      expect(screen.getByText('from-props-true')).toBeDefined();
      expect(receivedPayloads).toEqual([
        { label: 'from-props', visible: true },
      ]);
    });

    it('accepts empty and partial props when all payload fields are optional', async () => {
      interface Payload {
        title?: string;
        count?: number;
      }

      let payloadOnMount: Payload | undefined;

      class OptionalVM extends ViewModelBaseMock<Payload> {
        protected willMount(): void {
          payloadOnMount = { ...this.payload };
        }
      }

      interface ComponentProps extends ViewModelProps<OptionalVM> {}

      const Optional = withPropsViewModel(
        OptionalVM,
        ({ model }: ComponentProps) => (
          <div>
            {model.payload.title ?? 'no-title'}-{model.payload.count ?? 0}
          </div>
        ),
      );

      type OuterProps = Parameters<typeof Optional>[0];

      Optional satisfies ComponentType<Payload>;
      expectTypeOf<OuterProps>().toMatchTypeOf<Payload>();
      expectTypeOf<Payload>().toMatchTypeOf<OuterProps>();

      const emptyScreen = await act(async () => render(<Optional />));

      expect(emptyScreen.getByText('no-title-0')).toBeDefined();
      expect(payloadOnMount).toEqual({});

      cleanup();

      const partialScreen = await act(async () =>
        render(<Optional title="hi" count={2} />),
      );

      expect(partialScreen.getByText('hi-2')).toBeDefined();
    });
  });

  describe('typings', () => {
    it('accepts payload props directly without payload wrapper', async () => {
      interface Payload {
        foo: number;
        bar?: string;
      }

      class YourVM extends ViewModelBase<Payload> {}

      const YourComponent = withPropsViewModel(YourVM, ({ model }) => {
        return <div>{model.payload.foo}</div>;
      });

      YourComponent satisfies ComponentType<Payload>;

      expectTypeOf<Parameters<typeof YourComponent>[0]>().toMatchTypeOf<Payload>();
      expectTypeOf<Payload>().toMatchTypeOf<Parameters<typeof YourComponent>[0]>();

      const screen = await act(async () =>
        render(<YourComponent foo={1} bar="x" />),
      );

      expect(screen.getByText('1')).toBeDefined();
    });

    it('does not expose payload in outer component props', async () => {
      interface Payload {
        foo: number;
      }

      class YourVM extends ViewModelBase<Payload> {}

      const YourComponent = withPropsViewModel(YourVM, ({ model }) => {
        return <div>{model.payload.foo}</div>;
      });

      type OuterProps = Parameters<typeof YourComponent>[0];

      expectTypeOf<OuterProps>().not.toHaveProperty('payload');
      expectTypeOf<OuterProps['foo']>().toBeNumber();

      const screen = await act(async () => render(<YourComponent foo={42} />));

      expect(screen.getByText('42')).toBeDefined();
    });

    it('requires payload wrapper for withViewModel but not for withPropsViewModel', async () => {
      interface Payload {
        foo: number;
      }

      class YourVM extends ViewModelBase<Payload> {}

      const WithPayload = withViewModel(YourVM, ({ model }) => (
        <div>{model.payload.foo}</div>
      ));
      const WithProps = withPropsViewModel(YourVM, ({ model }) => (
        <div>{model.payload.foo}</div>
      ));

      type WithPayloadProps = Parameters<typeof WithPayload>[0];
      type WithPropsProps = Parameters<typeof WithProps>[0];

      expectTypeOf<WithPayloadProps>().toHaveProperty('payload');
      expectTypeOf<WithPropsProps>().not.toHaveProperty('payload');

      expectTypeOf<WithPropsProps>().toMatchTypeOf<Payload>();
      expectTypeOf<Payload>().toMatchTypeOf<WithPropsProps>();
      expectTypeOf<{ payload: Payload }>().toMatchTypeOf<WithPayloadProps>();
      expectTypeOf<WithPayloadProps['payload']>().toEqualTypeOf<Payload>();

      const screen = await act(async () =>
        render(
          <>
            <WithProps foo={1} />
            <WithPayload payload={{ foo: 1 }} />
          </>,
        ),
      );

      expect(screen.getAllByText('1')).toHaveLength(2);
    });

    it('types inner view via ComponentProps extending ViewModelProps', async () => {
      interface Payload {
        userId: string;
      }

      class PageVM extends ViewModelBase<Payload> {}

      interface ComponentProps extends ViewModelProps<PageVM> {}

      const Page = withPropsViewModel<PageVM, ComponentProps>(
        PageVM,
        ({ model }) => {
          expectTypeOf(model).toEqualTypeOf<PageVM>();
          expectTypeOf(model.payload.userId).toBeString();
          return <div>{model.payload.userId}</div>;
        },
      );

      type OuterProps = Parameters<typeof Page>[0];

      Page satisfies ComponentType<Payload>;

      expectTypeOf<OuterProps>().toMatchTypeOf<Payload>();
      expectTypeOf<Payload>().toMatchTypeOf<OuterProps>();
      expectTypeOf<OuterProps>().not.toHaveProperty('model');
      expectTypeOf<OuterProps>().not.toHaveProperty('payload');

      const screen = await act(async () =>
        render(<Page userId="user-1" />),
      );

      expect(screen.getByText('user-1')).toBeDefined();
    });

    it('infers outer Payload when view callback is annotated with ComponentProps', async () => {
      interface Payload {
        userId: string;
      }

      class PageVM extends ViewModelBase<Payload> {}

      interface ComponentProps extends ViewModelProps<PageVM> {}

      const Page = withPropsViewModel(
        PageVM,
        ({ model }: ComponentProps) => {
          expectTypeOf(model).toEqualTypeOf<PageVM>();
          expectTypeOf(model.payload.userId).toBeString();
          return <div>{model.payload.userId}</div>;
        },
      );

      type OuterProps = Parameters<typeof Page>[0];

      Page satisfies ComponentType<Payload>;

      expectTypeOf<OuterProps>().toMatchTypeOf<Payload>();
      expectTypeOf<Payload>().toMatchTypeOf<OuterProps>();
      expectTypeOf<OuterProps>().not.toHaveProperty('model');
      expectTypeOf<OuterProps>().not.toHaveProperty('payload');

      const screen = await act(async () =>
        render(<Page userId="user-2" />),
      );

      expect(screen.getByText('user-2')).toBeDefined();
    });

    describe('forwardedRef', () => {
      it('types forwardedRef via ViewModelProps second generic with forwardRef', async () => {
        interface Payload {
          title: string;
        }

        class TitleVM extends ViewModelBase<Payload> {}

        interface ComponentProps extends ViewModelProps<TitleVM, HTMLDivElement> {}

        const Title = withPropsViewModel(
          TitleVM,
          ({ forwardedRef, model }: ComponentProps) => {
            expectTypeOf(forwardedRef).toEqualTypeOf<
              React.ForwardedRef<HTMLDivElement> | undefined
            >();
            expectTypeOf(model.payload.title).toBeString();
            return <div ref={forwardedRef}>{model.payload.title}</div>;
          },
          { forwardRef: true },
        );

        const TestApp = () => {
          const ref = useRef<HTMLDivElement>(null);
          return <Title ref={ref} title="hello" />;
        };

        const screen = await act(async () => render(<TestApp />));

        expect(screen.getByText('hello')).toBeDefined();
      });

      it('types outer ref when forwardRef is enabled', async () => {
        interface Payload {
          title: string;
        }

        class TitleVM extends ViewModelBase<Payload> {}

        interface ComponentProps extends ViewModelProps<TitleVM, HTMLDivElement> {}

        const Title = withPropsViewModel<TitleVM, ComponentProps, HTMLDivElement>(
          TitleVM,
          ({ forwardedRef, model }: ComponentProps) => (
            <div ref={forwardedRef}>{model.payload.title}</div>
          ),
          { forwardRef: true },
        );

        type OuterProps = Parameters<typeof Title>[0];

        expectTypeOf<OuterProps['title']>().toBeString();
        expectTypeOf<OuterProps['ref']>().toEqualTypeOf<
          React.LegacyRef<HTMLDivElement> | undefined
        >();
        expectTypeOf<OuterProps>().not.toHaveProperty('forwardedRef');
        expectTypeOf<OuterProps>().not.toHaveProperty('model');
        expectTypeOf<OuterProps>().not.toHaveProperty('payload');

        const TestApp = () => {
          const ref = useRef<HTMLDivElement>(null);
          return <Title ref={ref} title="outer-ref" />;
        };

        const screen = await act(async () => render(<TestApp />));

        expect(screen.getByText('outer-ref')).toBeDefined();
      });

      it('infers outer ref when ComponentProps extends ViewModelProps with ref generic', async () => {
        interface Payload {
          title: string;
        }

        class TitleVM extends ViewModelBase<Payload> {}

        interface ComponentProps extends ViewModelProps<TitleVM, HTMLDivElement> {}

        const Title = withPropsViewModel(
          TitleVM,
          ({ forwardedRef, model }: ComponentProps) => {
            expectTypeOf(forwardedRef).toEqualTypeOf<
              React.ForwardedRef<HTMLDivElement> | undefined
            >();
            expectTypeOf(model.payload.title).toBeString();
            return <div ref={forwardedRef}>{model.payload.title}</div>;
          },
          { forwardRef: true },
        );

        type OuterProps = Parameters<typeof Title>[0];

        expectTypeOf<OuterProps['title']>().toBeString();
        expectTypeOf<OuterProps['ref']>().toEqualTypeOf<
          React.LegacyRef<HTMLDivElement> | undefined
        >();
        expectTypeOf<OuterProps>().not.toHaveProperty('forwardedRef');
        expectTypeOf<OuterProps>().not.toHaveProperty('model');
        expectTypeOf<OuterProps>().not.toHaveProperty('payload');

        const TestApp = () => {
          const ref = useRef<HTMLDivElement>(null);
          return <Title ref={ref} title="inferred-ref" />;
        };

        const screen = await act(async () => render(<TestApp />));

        expect(screen.getByText('inferred-ref')).toBeDefined();
      });

      it('types custom forwardedRef on outer component when overridden in ComponentProps', async () => {
        interface Payload {
          label: string;
        }

        class LabelVM extends ViewModelBase<Payload> {}

        interface ComponentProps extends ViewModelProps<LabelVM> {
          forwardedRef: number;
        }

        const Label = withPropsViewModel(
          LabelVM,
          ({ forwardedRef, model }: ComponentProps) => {
            expectTypeOf(forwardedRef).toEqualTypeOf<number>();
            expectTypeOf(model.payload.label).toBeString();
            return <div>{forwardedRef}</div>;
          },
        );

        type OuterProps = Parameters<typeof Label>[0];

        expectTypeOf<OuterProps['label']>().toBeString();
        expectTypeOf<OuterProps['forwardedRef']>().toBeNumber();
        expectTypeOf<OuterProps>().not.toHaveProperty('ref');
        expectTypeOf<OuterProps>().not.toHaveProperty('model');

        const screen = await act(async () =>
          render(<Label label="lbl" forwardedRef={7} />),
        );

        expect(screen.getByText('7')).toBeDefined();
      });

      it('types optional custom forwardedRef on outer component', async () => {
        interface Payload {
          label: string;
        }

        class LabelVM extends ViewModelBase<Payload> {}

        interface ComponentProps extends ViewModelProps<LabelVM> {
          forwardedRef?: number;
        }

        const Label = withPropsViewModel(
          LabelVM,
          ({ forwardedRef, model }: ComponentProps) => {
            expectTypeOf(forwardedRef).toEqualTypeOf<number | undefined>();
            expectTypeOf(model.payload.label).toBeString();
            return <div>{forwardedRef ?? 'none'}</div>;
          },
        );

        type OuterProps = Parameters<typeof Label>[0];

        expectTypeOf<OuterProps['label']>().toBeString();
        expectTypeOf<OuterProps['forwardedRef']>().toEqualTypeOf<
          number | undefined
        >();
        expectTypeOf<OuterProps>().not.toHaveProperty('ref');

        const screen = await act(async () =>
          render(<Label label="lbl" forwardedRef={9} />),
        );

        expect(screen.getByText('9')).toBeDefined();
      });

      it('types forwardedRef in view when ref is defined in ComponentProps with forwardRef', async () => {
        interface Payload {
          caption: string;
        }

        class CaptionVM extends ViewModelBase<Payload> {}

        interface ComponentProps extends ViewModelProps<CaptionVM> {
          ref?: React.LegacyRef<number>;
        }

        const Caption = withPropsViewModel<CaptionVM, ComponentProps, number>(
          CaptionVM,
          ({ forwardedRef, model }) => {
            expectTypeOf(forwardedRef).toEqualTypeOf<
              React.ForwardedRef<number> | undefined
            >();
            expectTypeOf(model.payload.caption).toBeString();
            return <div>{model.payload.caption}</div>;
          },
          { forwardRef: true },
        );

        const TestApp = () => {
          const ref = useRef(1);
          return <Caption ref={ref} caption="caption" />;
        };

        const screen = await act(async () => render(<TestApp />));

        expect(screen.getByText('caption')).toBeDefined();
      });
    });
  });

  describe('ViewModelSimple', () => {
    it('renders without outer props when VM has no payload type', async () => {
      class VM implements ViewModelSimple {
        id = 'simple-id';
        foo = 'bar';
      }

      const Component = withPropsViewModel(VM, ({ model }) => (
        <div>{`hello ${model.id} ${model.foo}`}</div>
      ));

      const screen = await act(async () => render(<Component />));

      expect(screen.getByText('hello simple-id bar')).toBeDefined();
    });

    it('calls setPayload with flat props on mount', async () => {
      interface Payload {
        count: number;
      }

      const setPayloadSpy = vi.fn();

      class CounterVM implements ViewModelSimple<Payload> {
        id = 'counter';

        setPayload(payload: Payload): void {
          setPayloadSpy(payload);
        }
      }

      const Counter = withPropsViewModel(CounterVM, ({ model }) => (
        <div>{model.id}</div>
      ));

      await act(async () => render(<Counter count={3} />));

      expect(setPayloadSpy).toHaveBeenCalledTimes(1);
      expect(setPayloadSpy).toHaveBeenCalledWith({ count: 3 });
    });

    it('calls setPayload again when component props change', async () => {
      interface Payload {
        value: string;
      }

      const setPayloadSpy = vi.fn();

      class ValueVM implements ViewModelSimple<Payload> {
        id = 'value-vm';
        private item: Payload = { value: '' };

        setPayload(payload: Payload): void {
          setPayloadSpy(payload);
          this.item = payload;
        }

        get value() {
          return this.item.value;
        }
      }

      const Value = withPropsViewModel(
        ValueVM,
        ({ model }) => <div>{model.value}</div>,
      );

      const screen = await act(async () =>
        render(<Value value="first" />),
      );

      expect(screen.getByText('first')).toBeDefined();
      expect(setPayloadSpy).toHaveBeenCalledTimes(1);
      expect(setPayloadSpy).toHaveBeenLastCalledWith({ value: 'first' });

      await act(async () => {
        screen.rerender(<Value value="second" />);
      });

      expect(screen.getByText('second')).toBeDefined();
      expect(setPayloadSpy).toHaveBeenCalledTimes(2);
      expect(setPayloadSpy).toHaveBeenLastCalledWith({ value: 'second' });
    });

    it('passes payload fields to the view and into setPayload', async () => {
      interface Payload {
        label: string;
        visible: boolean;
      }

      const receivedPayloads: Payload[] = [];

      class LabelVM implements ViewModelSimple<Payload> {
        id = 'label-vm';

        setPayload(payload: Payload): void {
          receivedPayloads.push(payload);
        }
      }

      const Label = withPropsViewModel(LabelVM, ({ label, visible, model }) => {
        expectTypeOf(model).toEqualTypeOf<LabelVM>();
        return (
          <div>
            {label}-{String(visible)}
          </div>
        );
      });

      type LabelOuterProps = Parameters<typeof Label>[0];

      expectTypeOf<LabelOuterProps['label']>().toBeString();
      expectTypeOf<LabelOuterProps['visible']>().toBeBoolean();

      const screen = await act(async () =>
        render(<Label label="from-props" visible />),
      );

      expect(screen.getByText('from-props-true')).toBeDefined();
      expect(receivedPayloads).toEqual([
        { label: 'from-props', visible: true },
      ]);
    });

    it('accepts empty and partial props when all payload fields are optional', async () => {
      interface Payload {
        title?: string;
        count?: number;
      }

      const setPayloadSpy = vi.fn();

      class OptionalVM implements ViewModelSimple<Payload> {
        id = 'optional-vm';

        setPayload(payload: Payload): void {
          setPayloadSpy(payload);
        }
      }

      const Optional = withPropsViewModel(
        OptionalVM,
        ({ title, count }) => (
          <div>
            {title ?? 'no-title'}-{count ?? 0}
          </div>
        ),
      );

      type OuterProps = Parameters<typeof Optional>[0];

      Optional satisfies ComponentType<Payload>;
      expectTypeOf<OuterProps>().toMatchTypeOf<Payload>();
      expectTypeOf<Payload>().toMatchTypeOf<OuterProps>();

      const emptyScreen = await act(async () => render(<Optional />));

      expect(emptyScreen.getByText('no-title-0')).toBeDefined();
      expect(setPayloadSpy).toHaveBeenCalledWith({});

      cleanup();

      const partialScreen = await act(async () =>
        render(<Optional title="hi" count={2} />),
      );

      expect(partialScreen.getByText('hi-2')).toBeDefined();
    });

    describe('without implements ViewModelSimple', () => {
      it('renders plain class without outer props', async () => {
        class VM {
          foo = 'bar';
        }

        const Component = withPropsViewModel(VM, ({ model }) => (
          <div>{`hello ${model.foo}`}</div>
        ));

        const screen = await act(async () => render(<Component />));

        expect(screen.getByText('hello bar')).toBeDefined();
      });
    });

    describe('typings', () => {
      it('accepts payload props directly without payload wrapper', async () => {
        interface Payload {
          foo: number;
          bar?: string;
        }

        class YourVM implements ViewModelSimple<Payload> {
          id = 'your-vm';

          setPayload(_payload: Payload): void {}
        }

        const YourComponent = withPropsViewModel(YourVM, ({ model }) => (
          <div>{model.id}</div>
        ));

        YourComponent satisfies ComponentType<Payload>;

        expectTypeOf<Parameters<typeof YourComponent>[0]>().toMatchTypeOf<Payload>();
        expectTypeOf<Payload>().toMatchTypeOf<
          Parameters<typeof YourComponent>[0]
        >();
        expectTypeOf<Parameters<typeof YourComponent>[0]['foo']>().toBeNumber();

        const screen = await act(async () =>
          render(<YourComponent foo={1} bar="x" />),
        );

        expect(screen.getByText('your-vm')).toBeDefined();
      });

      it('does not expose payload in outer component props', async () => {
        interface Payload {
          foo: number;
        }

        class YourVM implements ViewModelSimple<Payload> {
          id = 'your-vm';

          setPayload(_payload: Payload): void {}
        }

        const YourComponent = withPropsViewModel(YourVM, ({ model }) => (
          <div>{model.id}</div>
        ));

        type OuterProps = Parameters<typeof YourComponent>[0];

        expectTypeOf<OuterProps>().not.toHaveProperty('payload');
        expectTypeOf<OuterProps['foo']>().toBeNumber();

        const screen = await act(async () =>
          render(<YourComponent foo={42} />),
        );

        expect(screen.getByText('your-vm')).toBeDefined();
      });

      it('types inner view via ComponentProps extending ViewModelProps', async () => {
        interface Payload {
          userId: string;
        }

        class PageVM implements ViewModelSimple<Payload> {
          id = 'page-vm';

          private item!: Payload;

          setPayload(payload: Payload): void {
            this.item = payload;
          }

          get userId() {
            return this.item.userId;
          }
        }

        interface ComponentProps extends ViewModelProps<PageVM> {}

        const Page = withPropsViewModel(PageVM, ({ model }: ComponentProps) => {
          expectTypeOf(model).toEqualTypeOf<PageVM>();
          expectTypeOf(model.userId).toBeString();
          return <div>{model.userId}</div>;
        });

        type OuterProps = Parameters<typeof Page>[0];

        Page satisfies ComponentType<Payload>;

        expectTypeOf<OuterProps>().toMatchTypeOf<Payload>();
        expectTypeOf<Payload>().toMatchTypeOf<OuterProps>();
        expectTypeOf<OuterProps>().not.toHaveProperty('model');
        expectTypeOf<OuterProps>().not.toHaveProperty('payload');

        const screen = await act(async () =>
          render(<Page userId="user-1" />),
        );

        expect(screen.getByText('user-1')).toBeDefined();
      });

      it('infers outer Payload when view callback is annotated with ComponentProps', async () => {
        interface Payload {
          userId: string;
        }

        class PageVM implements ViewModelSimple<Payload> {
          id = 'page-vm';

          private item!: Payload;

          setPayload(payload: Payload): void {
            this.item = payload;
          }

          get userId() {
            return this.item.userId;
          }
        }

        interface ComponentProps extends ViewModelProps<PageVM> {}

        const Page = withPropsViewModel(
          PageVM,
          ({ model }: ComponentProps) => {
            expectTypeOf(model).toEqualTypeOf<PageVM>();
            expectTypeOf(model.userId).toBeString();
            return <div>{model.userId}</div>;
          },
        );

        type OuterProps = Parameters<typeof Page>[0];

        Page satisfies ComponentType<Payload>;

        expectTypeOf<OuterProps>().toMatchTypeOf<Payload>();
        expectTypeOf<Payload>().toMatchTypeOf<OuterProps>();
        expectTypeOf<OuterProps>().not.toHaveProperty('model');
        expectTypeOf<OuterProps>().not.toHaveProperty('payload');

        const screen = await act(async () =>
          render(<Page userId="user-2" />),
        );

        expect(screen.getByText('user-2')).toBeDefined();
      });
    });
  });
});
