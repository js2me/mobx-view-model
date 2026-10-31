import { renderToString } from '@vue/server-renderer';
import {
  ViewModelBase,
  ViewModelStoreBase,
  viewModelsConfig,
} from 'mobx-view-model';
import { describe, expect, it } from 'vitest';
import { createSSRApp, defineComponent, h, nextTick, ref } from 'vue';
import { OnlyViewModel } from './only-view-model.js';
import { ViewModelsProvider } from './providers.js';
import { mount } from './test-utils.fixture.js';
import {
  provideActiveViewModel,
  useActiveViewModel,
} from './use-active-view-model.js';
import { useViewModelsStore } from './use-view-model-store.js';
import { withViewModel } from './with-view-model.js';

const flush = async () => {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await nextTick();
};

describe('review regressions', () => {
  it('OnlyViewModel reveals the slot after async mounting and follows payload changes', async () => {
    let ready!: () => void;
    class VM extends ViewModelBase<{ count: number }> {
      async mount() {
        await new Promise<void>((resolve) => {
          ready = resolve;
        });
        await super.mount();
      }
    }
    const payload = ref({ count: 1 });
    const result = mount(
      defineComponent({
        setup: () => () =>
          h(
            OnlyViewModel,
            { model: VM, payload: payload.value },
            {
              default: ({ model }: { model: VM }) =>
                h('div', String(model.payload.count)),
            },
          ),
      }),
    );
    try {
      expect(result.el.textContent).toBe('');
      ready();
      await flush();
      expect(result.el.textContent).toBe('1');
      payload.value = { count: 2 };
      await flush();
      expect(result.el.textContent).toBe('2');
    } finally {
      result.unmount();
    }
  });

  it('null active context shadows the parent and absent store stays null', () => {
    let active: unknown = 'unset';
    let store: unknown = 'unset';
    const Child = defineComponent({
      setup() {
        active = useActiveViewModel();
        store = useViewModelsStore();
        return () => null;
      },
    });
    const Boundary = defineComponent({
      setup() {
        provideActiveViewModel(null);
        return () => h(Child);
      },
    });
    const Root = defineComponent({
      setup() {
        provideActiveViewModel({});
        return () => h(Boundary);
      },
    });
    const result = mount(Root);
    try {
      expect(active).toBeNull();
      expect(store).toBeNull();
    } finally {
      result.unmount();
    }
  });

  it('accepts render options, template options, and omitted config in curried form', async () => {
    class VM extends ViewModelBase {}
    const Render = withViewModel(VM, { render: () => h('div', 'render') });
    const Template = withViewModel(VM, { template: '<div>template</div>' });
    const Curried = withViewModel(VM)(
      defineComponent({ setup: () => () => h('div', 'curried') }),
    );
    const result = mount(
      defineComponent({
        setup: () => () => h('section', [h(Render), h(Template), h(Curried)]),
      }),
    );
    try {
      await flush();
      expect(result.el.textContent).toBe('rendertemplatecurried');
    } finally {
      result.unmount();
    }
  });

  it('connect preserves caller anchors and registers the added anchor', async () => {
    class VM extends ViewModelBase {}
    const anchor = defineComponent({ render: () => null });
    const initial = defineComponent({ render: () => null });
    const anchors = [initial];
    const store = new ViewModelStoreBase();
    const Connected = withViewModel(VM, { anchors })(
      defineComponent({ render: () => h('div') }),
    );
    Connected.connect(anchor);
    expect(anchors).toEqual([initial]);
    const result = mount(
      defineComponent({
        setup: () => () =>
          h(ViewModelsProvider, { value: store }, () => h(Connected)),
      }),
    );
    try {
      await flush();
      expect(store.get(anchor)).toBeInstanceOf(VM);
      expect(store.get(initial)).toBe(store.get(anchor));
    } finally {
      result.unmount();
    }
    expect(store.get(anchor)).toBeNull();
  });

  it('model props stay current after parent attrs change', async () => {
    class VM extends ViewModelBase {
      get label() {
        return this.props.label;
      }
    }
    let model: VM | undefined;
    const View = defineComponent({
      props: { model: Object },
      setup(props) {
        model = props.model as VM;
        return () => null;
      },
    });
    const Connected = withViewModel(VM, View);
    const label = ref('first');
    const result = mount(
      defineComponent({
        setup: () => () => h(Connected, { label: label.value }),
      }),
    );
    try {
      await flush();
      expect(model?.label).toBe('first');
      label.value = 'second';
      await flush();
      expect(model?.label).toBe('second');
    } finally {
      result.unmount();
    }
  });

  it('SSR awaits async mount and does not cross request stores', async () => {
    const previousMode = viewModelsConfig.mode;
    viewModelsConfig.mode = 'ssr';
    class VM extends ViewModelBase<{ label: string }> {
      async mount() {
        await Promise.resolve();
        await super.mount();
      }
    }
    const Connected = withViewModel(
      VM,
      defineComponent({
        props: { model: Object },
        setup: (props) => () => h('div', (props.model as VM).payload.label),
      }),
      { id: 'page' },
    );
    const render = async (label: string) => {
      const store = new ViewModelStoreBase();
      try {
        return await renderToString(
          createSSRApp(() =>
            h(ViewModelsProvider, { value: store }, () =>
              h(Connected, { payload: { label } }),
            ),
          ),
        );
      } finally {
        for (const model of store.getAll(null)) await store.unmount(model);
        store.clean();
      }
    };
    try {
      const [one, two] = await Promise.all([render('one'), render('two')]);
      expect(one).toContain('<div>one</div>');
      expect(two).toContain('<div>two</div>');
    } finally {
      viewModelsConfig.mode = previousMode;
    }
  });
});
