import {
  ViewModelBase,
  ViewModelStoreBase,
  viewModelsConfig,
} from 'mobx-view-model';
import { describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
import {
  OnlyViewModel,
  useCreateViewModel,
  useViewModel,
  ViewModelsProvider,
  withPropsViewModel,
  withViewModel,
} from './index.js';
import { mount } from './test-utils.fixture.js';

const flush = async () => {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await nextTick();
};

describe('Solid API parity', () => {
  it('accepts a payload getter, mounts during setup, and unmounts with the owner', async () => {
    const count = ref(1);
    const unmountHook = vi.fn();
    class VM extends ViewModelBase<{ count: number }> {
      protected willUnmount() {
        unmountHook();
      }
    }
    let model!: VM;
    const Root = defineComponent({
      setup() {
        model = useCreateViewModel(VM, () => ({ count: count.value }));
        expect(model.isMounted).toBe(true);
        return () => h('div');
      },
    });
    const result = mount(Root);
    try {
      expect(model.payload).toEqual({ count: 1 });
      count.value = 2;
      await nextTick();
      expect(model.payload).toEqual({ count: 2 });
    } finally {
      result.unmount();
    }
    expect(unmountHook).toHaveBeenCalledOnce();
  });

  it('passes a simple-model getter payload and creation config without wrapping values', async () => {
    const received: unknown[] = [];
    const initialized = vi.fn();
    const count = ref(1);
    const store = new ViewModelStoreBase();
    class VM {
      init(config: unknown) {
        initialized(config);
      }
      setPayload(payload: { count: number }) {
        received.push(payload);
      }
    }
    const Child = defineComponent({
      setup() {
        useCreateViewModel(VM, () => ({ count: count.value }), {
          VM,
          id: 'simple',
          payload: { count: 1 },
        });
        return () => null;
      },
    });
    const result = mount(
      defineComponent({
        setup: () => () =>
          h(ViewModelsProvider, { value: store }, () => h(Child)),
      }),
    );
    try {
      expect(initialized).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'simple', viewModels: store }),
      );
      expect(received).toEqual([{ count: 1 }]);
      count.value = 2;
      await nextTick();
      expect(received.at(-1)).toEqual({ count: 2 });
    } finally {
      result.unmount();
    }
    expect(store.get('simple')).toBeNull();
  });

  it('supports the fourth props argument', () => {
    class VM extends ViewModelBase {
      get label() {
        return this.props.label;
      }
    }
    let model!: VM;
    const result = mount(
      defineComponent({
        setup() {
          model = useCreateViewModel(
            VM,
            {},
            { props: { label: 'config' } },
            { label: 'argument' },
          );
          return () => null;
        },
      }),
    );
    try {
      expect(model.label).toBe('argument');
    } finally {
      result.unmount();
    }
  });

  it('withPropsViewModel snapshots all props and preserves the registered instance', async () => {
    class VM extends ViewModelBase<{ label: string; count: number }> {}
    const store = new ViewModelStoreBase();
    const label = ref('first');
    const count = ref(1);
    const Page = withPropsViewModel(
      VM,
      ({ model }) => h('div', `${model.payload.label}:${model.payload.count}`),
      { id: 'props-page' },
    );
    const Root = defineComponent({
      setup: () => () =>
        h(ViewModelsProvider, { value: store }, () =>
          h(Page, { label: label.value, count: count.value }),
        ),
    });
    const result = mount(Root);
    try {
      const model = store.get(VM)!;
      const firstPayload = model.payload;
      expect(result.el.textContent).toBe('first:1');
      count.value = 2;
      await flush();
      expect(result.el.textContent).toBe('first:2');
      expect(model.payload).not.toBe(firstPayload);
      expect(model.payload).toEqual({ label: 'first', count: 2 });
      label.value = 'second';
      await flush();
      expect(result.el.textContent).toBe('second:2');
      expect(store.get('props-page')).toBe(model);
    } finally {
      result.unmount();
    }
    expect(store.get(VM)).toBeNull();
  });

  it('withPropsViewModel updates simple-model snapshots', async () => {
    const received: Array<{ label: string; count: number }> = [];
    class VM {
      setPayload(payload: { label: string; count: number }) {
        received.push(payload);
      }
    }
    const label = ref('first');
    const count = ref(1);
    const Page = withPropsViewModel(VM, () => h('span', 'page'));
    const result = mount(
      defineComponent({
        setup: () => () => h(Page, { label: label.value, count: count.value }),
      }),
    );
    try {
      expect(received).toHaveLength(1);
      expect(received[0]).toEqual({ label: 'first', count: 1 });
      count.value = 2;
      await nextTick();
      expect(received.at(-1)).toEqual({ label: 'first', count: 2 });
      expect(received.at(-1)).not.toBe(received[0]);
    } finally {
      result.unmount();
    }
  });

  it('does not apply the full-model mount gate to simple models', () => {
    class VM {
      readonly isMounted = false;
    }
    const Page = withViewModel(VM, () => h('span', 'simple'));
    const result = mount(defineComponent({ setup: () => () => h(Page) }));
    try {
      expect(result.el.textContent).toBe('simple');
    } finally {
      result.unmount();
    }
  });

  it('tracks props added to or removed from an initially empty payload', async () => {
    const received: unknown[] = [];
    class VM {
      setPayload(payload: any) {
        received.push(payload);
      }
    }
    const input = ref<Record<string, number>>({});
    const Page = withPropsViewModel(VM, () => null);
    const result = mount(
      defineComponent({ setup: () => () => h(Page, input.value) }),
    );
    try {
      expect(received.at(-1)).toEqual({});
      input.value = { count: 1 };
      await flush();
      expect(received.at(-1)).toEqual({ count: 1 });
      input.value = {};
      await flush();
      expect(received.at(-1)).toEqual({});
    } finally {
      result.unmount();
    }
  });

  it('supports typed model lookup by connected component and its connect anchor', () => {
    class VM extends ViewModelBase {}
    let active!: VM;
    let connected!: VM;
    let anchored!: VM;
    const anchor = defineComponent({ render: () => null });
    const Child = defineComponent({
      setup() {
        active = useViewModel<VM>();
        connected = useViewModel(Page);
        anchored = useViewModel<VM>(anchor);
        return () => null;
      },
    });
    const Page = withPropsViewModel(VM, () => h(Child)).connect(anchor);
    const store = new ViewModelStoreBase();
    const result = mount(
      defineComponent({
        setup: () => () =>
          h(ViewModelsProvider, { value: store }, () => h(Page)),
      }),
    );
    try {
      expect(connected).toBeInstanceOf(VM);
      expect(connected).toBe(active);
      expect(anchored).toBe(active);
    } finally {
      result.unmount();
    }
  });

  it('uses global getPayload and includes live payload in model props and vueHook', async () => {
    const previous = viewModelsConfig.getPayload;
    const label = ref('one');
    let model!: VM;
    const hook = vi.fn();
    class VM extends ViewModelBase<{ label: string }> {
      get input() {
        return this.props.label;
      }
      get inputPayload() {
        return this.props.payload;
      }
    }
    viewModelsConfig.getPayload = (props) => ({ label: props.label });
    const Page = withViewModel(
      VM,
      ({ model: vm }) => {
        model = vm;
        return h('div', vm.payload.label);
      },
      { vueHook: hook, ctx: { custom: true } },
    );
    const payload = { label: 'raw' };
    const result = mount(
      defineComponent({
        setup: () => () => h(Page, { label: label.value, payload }),
      }),
    );
    try {
      expect(result.el.textContent).toBe('one');
      expect(model.inputPayload).toBe(payload);
      expect(hook).toHaveBeenCalledWith(
        expect.objectContaining({ label: 'one', payload }),
        { custom: true },
        null,
      );
      label.value = 'two';
      await flush();
      expect(model.input).toBe('two');
      expect(result.el.textContent).toBe('two');
      expect(hook.mock.calls[0][0].label).toBe('two');
      expect(hook).toHaveBeenCalledOnce();
    } finally {
      result.unmount();
      viewModelsConfig.getPayload = previous;
    }
  });

  it('applies processRender once and lets local configuration override globals', () => {
    class VM extends ViewModelBase {}
    const global = viewModelsConfig.processRender;
    const globalProcess = vi.fn();
    const process = vi.fn(
      (render: any) => (props: any) =>
        h('section', [h('b', 'processed'), render(props)]),
    );
    viewModelsConfig.processRender = globalProcess;
    const Page = withViewModel(VM, () => h('span', 'view'), {
      vmConfig: { processRender: process },
    });
    const result = mount(defineComponent({ setup: () => () => h(Page) }));
    try {
      expect(result.el.textContent).toBe('processedview');
      expect(process).toHaveBeenCalledOnce();
      expect(globalProcess).not.toHaveBeenCalled();
    } finally {
      result.unmount();
      viewModelsConfig.processRender = global;
    }
  });

  it('honors local fallbackComponent and an explicit fallback override', async () => {
    const global = viewModelsConfig.fallbackComponent;
    viewModelsConfig.fallbackComponent = () => h('i', 'global');
    class VM extends ViewModelBase {
      protected async willMount() {
        await Promise.resolve();
      }
    }
    const local = () => h('i', 'local');
    const fallback = () => h('i', 'explicit');
    const Local = withViewModel(VM, () => h('span', 'view'), {
      vmConfig: { fallbackComponent: local },
    });
    const Explicit = withViewModel(VM, () => h('span', 'view'), {
      vmConfig: { fallbackComponent: local },
      fallback,
    });
    const result = mount(
      defineComponent({ setup: () => () => h('div', [h(Local), h(Explicit)]) }),
    );
    try {
      expect(result.el.textContent).toBe('localexplicit');
      await flush();
      expect(result.el.textContent).toBe('viewview');
    } finally {
      result.unmount();
      viewModelsConfig.fallbackComponent = global;
    }
  });

  it('OnlyViewModel accepts a children(model) render prop', async () => {
    class VM extends ViewModelBase<{ count: number }> {}
    const count = ref(1);
    const result = mount(
      defineComponent({
        setup: () => () =>
          h(OnlyViewModel<VM>, {
            model: VM,
            payload: { count: count.value },
            children: (model: VM) => h('span', String(model.payload.count)),
          }),
      }),
    );
    try {
      expect(result.el.textContent).toBe('1');
      count.value = 2;
      await flush();
      expect(result.el.textContent).toBe('2');
    } finally {
      result.unmount();
    }
  });
});
