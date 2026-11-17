import { observable, runInAction } from 'mobx';
import { ViewModelBase, ViewModelStoreBase } from 'mobx-view-model';
import { expect, it, vi } from 'vitest';
import {
  type ComponentPublicInstance,
  defineComponent,
  type FunctionalComponent,
  h,
  nextTick,
  ref,
} from 'vue';
import {
  ActiveViewModelProvider,
  observer,
  useCreateViewModel,
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

it('initializes a simple model payload and parent before mounting', () => {
  const parent = {};
  let model!: Simple;
  const received: unknown[] = [];
  class Simple {
    payload?: { count: number };
    parentViewModel?: any;
    init(config: any) {
      received.push(config.payload);
    }
    setPayload(payload: { count: number }) {
      this.payload = payload;
      received.push(payload);
    }
    mount() {
      expect(this.payload).toEqual({ count: 1 });
      expect(this.parentViewModel).toBe(parent);
    }
  }
  const source = vi.fn(() => ({ count: 1 }));
  const Child = defineComponent({
    setup() {
      model = useCreateViewModel(Simple, source);
      return () => null;
    },
  });
  const result = mount(
    defineComponent({
      setup: () => () =>
        h(ActiveViewModelProvider, { value: parent }, () => h(Child)),
    }),
  );
  try {
    expect(model.payload).toBe(received[0]);
    expect(received[1]).toBe(received[0]);
  } finally {
    result.unmount();
  }
});

it('keeps a shared store model mounted until the last consumer releases it', async () => {
  const store = new ViewModelStoreBase();
  const mounts = vi.fn();
  const unmounts = vi.fn();
  class VM extends ViewModelBase {
    protected didMount() {
      mounts();
    }
    protected willUnmount() {
      unmounts();
    }
  }
  const Page = withViewModel(
    VM,
    ({ model }) => h('span', model.isMounted ? 'mounted' : 'unmounted'),
    { id: 'shared' },
  );
  const first = ref(true);
  const second = ref(true);
  const result = mount(
    defineComponent({
      setup: () => () =>
        h(ViewModelsProvider, { value: store }, () => [
          first.value ? h(Page, { key: 'one' }) : null,
          second.value ? h(Page, { key: 'two' }) : null,
        ]),
    }),
  );
  try {
    const model = store.get(VM)!;
    expect(mounts).toHaveBeenCalledOnce();
    first.value = false;
    await flush();
    expect(store.get(VM)).toBe(model);
    expect(model.isMounted).toBe(true);
    expect(unmounts).not.toHaveBeenCalled();
    expect(result.el.textContent).toBe('mounted');
    second.value = false;
    await flush();
    expect(unmounts).toHaveBeenCalledOnce();
    expect(store.get(VM)).toBeNull();
  } finally {
    result.unmount();
  }
});

it('does not unregister a replacement when an old store consumer unmounts', () => {
  const store = new ViewModelStoreBase();
  const unmounts = vi.fn();
  class VM extends ViewModelBase {
    protected willUnmount() {
      unmounts();
    }
  }
  const Page = withViewModel(VM, () => null, { id: 'shared' });
  const result = mount(
    defineComponent({
      setup: () => () => h(ViewModelsProvider, { value: store }, () => h(Page)),
    }),
  );
  const old = store.get(VM)!;
  const replacement = store.create({ VM, id: 'shared', payload: {} });
  store.connect(replacement, { VM, id: 'shared', payload: {} });
  replacement.mount();
  result.unmount();
  expect(old.isMounted).toBe(false);
  expect(unmounts).toHaveBeenCalledOnce();
  expect(store.get('shared')).toBe(replacement);
  expect(store.get(VM)).toBe(replacement);
  expect(replacement.isMounted).toBe(true);
  store.unmount(replacement);
});

it.each(['setup', 'options', 'template'] as const)(
  'updates plain simple-model payload views using %s rendering',
  async (kind) => {
    class Simple {
      payload = { count: 0 };
      setPayload(payload: { count: number }) {
        this.payload = payload;
      }
    }
    const props = { model: { type: Object, required: true } } as const;
    const View =
      kind === 'setup'
        ? defineComponent({
            props,
            setup: (p) => () =>
              h('span', String((p.model as Simple).payload.count)),
          })
        : kind === 'options'
          ? defineComponent({
              props,
              render() {
                return h('span', String((this.model as Simple).payload.count));
              },
            })
          : defineComponent({
              props,
              template: '<span>{{ model.payload.count }}</span>',
            });
    const Page = withViewModel(Simple, View);
    const count = ref(1);
    const result = mount(
      defineComponent({
        setup: () => () => h(Page, { payload: { count: count.value } }),
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
  },
);

it('retains this for a setup render function', async () => {
  const state = observable({ count: 1 });
  const Comp = observer(
    defineComponent({
      props: { label: String },
      setup() {
        return function (this: ComponentPublicInstance<{ label: string }>) {
          return h('span', this.label + state.count);
        };
      },
    }),
  );
  const result = mount(
    defineComponent({ setup: () => () => h(Comp, { label: 'count:' }) }),
  );
  try {
    expect(result.el.textContent).toBe('count:1');
    runInAction(() => {
      state.count = 2;
    });
    await nextTick();
    expect(result.el.textContent).toBe('count:2');
  } finally {
    result.unmount();
  }
});

it('observes runtime-compiled template observables', async () => {
  const state = observable({ count: 1 });
  const Comp = observer(
    defineComponent({
      setup: () => ({ state }),
      template: '<span>{{ state.count }}</span>',
    }),
  );
  const result = mount(Comp);
  try {
    expect(result.el.textContent).toBe('1');
    runInAction(() => {
      state.count = 2;
    });
    await nextTick();
    expect(result.el.textContent).toBe('2');
  } finally {
    result.unmount();
  }
});

it('preserves native scoped slots through processRender', () => {
  class VM extends ViewModelBase {}
  const View = defineComponent({
    setup: (_, ctx) => () => h('div', ctx.slots.default?.({ label: 'scoped' })),
  });
  const process = (render: any) => (props: any) =>
    h('section', [render(props)]);
  const Page = withViewModel(VM, View, {
    vmConfig: { processRender: process },
  });
  const result = mount(
    defineComponent({
      setup: () => () =>
        h(
          Page,
          {},
          { default: ({ label }: { label: string }) => h('span', label) },
        ),
    }),
  );
  try {
    expect(result.el.textContent).toBe('scoped');
  } finally {
    result.unmount();
  }
});

it('uses Vue functional fallthrough rules without leaking model props into DOM', () => {
  class VM extends ViewModelBase {}
  const click = vi.fn();
  const View: FunctionalComponent<{ model: VM; label: string }> = (props) =>
    h('button', props.label);
  const Page = withViewModel(VM, View);
  const result = mount(
    defineComponent({
      setup: () => () =>
        h(Page, {
          label: 'text',
          class: 'kept',
          style: { color: 'red' },
          onClick: click,
          'data-private': 'hidden',
        }),
    }),
  );
  try {
    const button = result.el.querySelector('button')!;
    expect(button.textContent).toBe('text');
    expect(button.hasAttribute('model')).toBe(false);
    expect(button.hasAttribute('label')).toBe(false);
    expect(button.hasAttribute('data-private')).toBe(false);
    expect(button.className).toBe('kept');
    expect(button.style.color).toBe('red');
    button.click();
    expect(click).toHaveBeenCalledOnce();
  } finally {
    result.unmount();
  }
});

it('respects inheritAttrs false for functional views', () => {
  const View: FunctionalComponent = () => h('span', 'text');
  View.inheritAttrs = false;
  const Comp = observer(View);
  const result = mount(
    defineComponent({ setup: () => () => h(Comp, { class: 'hidden' }) }),
  );
  try {
    expect(result.el.querySelector('span')!.hasAttribute('class')).toBe(false);
  } finally {
    result.unmount();
  }
});

it('updates direct props forwarded by withPropsViewModel', async () => {
  class VM extends ViewModelBase<{ label: string }> {}
  const Page = withPropsViewModel(VM, ({ model }) =>
    h('span', model.payload.label),
  );
  const label = ref('first');
  const result = mount(
    defineComponent({ setup: () => () => h(Page, { label: label.value }) }),
  );
  try {
    label.value = 'second';
    await flush();
    expect(result.el.textContent).toBe('second');
  } finally {
    result.unmount();
  }
});
