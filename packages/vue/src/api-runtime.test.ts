import { ViewModelBase, ViewModelStoreBase } from 'mobx-view-model';
import { expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
import {
  OnlyViewModel,
  useCreateViewModel,
  ViewModelsProvider,
} from './index.js';
import { mount } from './test-utils.fixture.js';

it('OnlyViewModel is callable and returns a live model-owning vnode', async () => {
  const unmountHook = vi.fn();
  const models: VM[] = [];
  class VM extends ViewModelBase<{ count: number }> {
    protected didMount() {
      models.push(this);
    }
    protected willUnmount() {
      unmountHook();
    }
  }
  const count = ref(1);
  const result = mount(
    defineComponent({
      setup: () => () =>
        OnlyViewModel({
          model: VM,
          payload: { count: count.value },
          children: (model) => h('span', String(model.payload.count)),
        }),
    }),
  );
  try {
    expect(typeof OnlyViewModel).toBe('function');
    expect(result.el.textContent).toBe('1');
    count.value = 2;
    await nextTick();
    expect(result.el.textContent).toBe('2');
    expect(models).toHaveLength(1);
    expect(models[0].payload).toEqual({ count: 2 });
  } finally {
    result.unmount();
  }
  expect(unmountHook).toHaveBeenCalledOnce();
});

it('assigns the canonical ID to custom-factory simple models before store indexing and cleans all registrations', () => {
  const unmountHook = vi.fn();
  const initHook = vi.fn();
  class Simple {
    declare id?: string;
    init() {
      initHook(this.id);
    }
    unmount() {
      unmountHook();
    }
  }
  const store = new ViewModelStoreBase();
  const unmountStore = vi.spyOn(store, 'unmount');
  let model!: Simple;
  const Child = defineComponent({
    setup() {
      model = useCreateViewModel(
        Simple,
        {},
        {
          VM: Simple,
          id: 'custom-model',
          payload: {},
          factory: () => new Simple(),
        },
      );
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
    expect(initHook).toHaveBeenCalledExactlyOnceWith('custom-model');
    expect(model.id).toBe('custom-model');
    expect(store.get('custom-model')).toBe(model);
    expect(store.getIds(Simple)).toEqual(['custom-model']);
  } finally {
    result.unmount();
  }
  expect(unmountStore).toHaveBeenCalledExactlyOnceWith(model);
  expect(unmountHook).toHaveBeenCalledOnce();
  expect(store.getIds(Simple)).toEqual([]);
  expect(store.get('custom-model')).toBeNull();
});
