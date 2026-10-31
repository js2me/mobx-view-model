import { renderToString } from '@vue/server-renderer';
import { getObserverTree, observable, runInAction } from 'mobx';
import { ViewModelBase, viewModelsConfig } from 'mobx-view-model';
import { describe, expect, it, vi } from 'vitest';
import {
  createApp,
  createSSRApp,
  defineComponent,
  type FunctionalComponent,
  h,
  nextTick,
  onErrorCaptured,
  ref,
} from 'vue';
import { observer } from './observer.js';
import { OnlyViewModel } from './only-view-model.js';
import { mount } from './test-utils.fixture.js';
import { withViewModel } from './with-view-model.js';

const flush = async () => {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await nextTick();
};

it('observes functional views and preserves declared props, emits, slots and attrs', async () => {
  const state = observable({ count: 1 });
  const onSelect = vi.fn();
  const View: FunctionalComponent<{ label: string }> = (props, ctx) =>
    h(
      'button',
      {
        onClick: () => ctx.emit('select', state.count),
        'data-extra': ctx.attrs['data-extra'],
      },
      [props.label, String(state.count), ctx.slots.default?.()],
    );
  View.props = { label: { type: String, required: true } };
  View.emits = ['select'];
  const Wrapped = observer(View);
  const label = ref('first');
  const result = mount(
    defineComponent({
      setup: () => () =>
        h(
          Wrapped,
          {
            label: label.value,
            'data-extra': 'extra',
            onSelect,
          },
          () => 'slot',
        ),
    }),
  );
  try {
    expect(result.el.textContent).toBe('first1slot');
    label.value = 'second';
    runInAction(() => {
      state.count = 2;
    });
    await nextTick();
    expect(result.el.textContent).toBe('second2slot');
    expect(result.el.querySelector('button')?.getAttribute('data-extra')).toBe(
      'extra',
    );
    result.el.querySelector('button')!.click();
    expect(onSelect).toHaveBeenCalledWith(2);
  } finally {
    result.unmount();
  }
  expect(getObserverTree(state, 'count').observers).toBeUndefined();
});

it('passes undeclared functional props and renders a function view through withViewModel', async () => {
  class VM extends ViewModelBase<{ count: number }> {}
  const View = (props: { model: VM; label: string }) =>
    h('span', props.label + props.model.payload.count);
  const Connected = withViewModel(VM, View);
  const count = ref(1);
  const label = ref('first');
  const result = mount(
    defineComponent({
      setup: () => () =>
        h(Connected, { label: label.value, payload: { count: count.value } }),
    }),
  );
  try {
    await flush();
    expect(result.el.textContent).toBe('first1');
    count.value = 2;
    label.value = 'second';
    await flush();
    expect(result.el.textContent).toBe('second2');
  } finally {
    result.unmount();
  }
});

describe.each(['setup', 'options'] as const)('%s render', (kind) => {
  it('does not retain observable subscriptions after SSR', async () => {
    const state = observable({ count: 1 });
    const render = vi.fn(() => h('div', String(state.count)));
    const Comp = observer(
      defineComponent(kind === 'setup' ? { setup: () => render } : { render }),
    );
    expect(await renderToString(createSSRApp(Comp))).toBe('<div>1</div>');
    expect(getObserverTree(state, 'count').observers).toBeUndefined();
    runInAction(() => {
      state.count = 2;
    });
    await nextTick();
    expect(render).toHaveBeenCalledTimes(1);
  });

  it.each([new Error('render failure'), undefined])(
    'forwards thrown %s to Vue error boundaries',
    (error) => {
      const captured = vi.fn();
      const render = () => {
        throw error;
      };
      const Comp = observer(
        defineComponent(
          kind === 'setup' ? { setup: () => render } : { render },
        ),
      );
      const Root = defineComponent({
        setup() {
          onErrorCaptured((caught) => {
            captured(caught);
            return false;
          });
          return () => h(Comp);
        },
      });
      const result = mount(Root);
      try {
        expect(captured).toHaveBeenCalledExactlyOnceWith(error);
      } finally {
        result.unmount();
      }
    },
  );
});

it('forwards render errors to the application error handler', () => {
  const error = new Error('app render failure');
  const handler = vi.fn();
  const Comp = observer(
    defineComponent({
      render() {
        throw error;
      },
    }),
  );
  const app = createApp(Comp);
  app.config.errorHandler = handler;
  const el = document.createElement('div');
  app.mount(el);
  try {
    expect(handler).toHaveBeenCalledWith(
      error,
      expect.anything(),
      'render function',
    );
  } finally {
    app.unmount();
  }
});

it.each(['OnlyViewModel', 'withViewModel'])(
  '%s hydrates existing content while async client mounting is pending',
  async (kind) => {
    const previousMode = viewModelsConfig.mode;
    viewModelsConfig.mode = 'ssr';
    let isClient = false;
    let ready!: () => void;
    const instances: VM[] = [];
    class VM extends ViewModelBase<{ count: number }> {
      constructor(config: any) {
        super(config);
        instances.push(this);
      }
      protected willMount() {
        if (isClient)
          return new Promise<void>((resolve) => {
            ready = resolve;
          });
      }
    }
    const View = defineComponent({
      props: { model: Object },
      setup: (props) => () =>
        h('span', String((props.model as VM).payload.count)),
    });
    const Connected = withViewModel(VM, View);
    const Root = defineComponent({
      setup: () => () =>
        kind === 'OnlyViewModel'
          ? h(
              OnlyViewModel,
              { model: VM, payload: { count: 1 } },
              {
                default: ({ model }: { model: VM }) =>
                  h('span', String(model.payload.count)),
              },
            )
          : h(Connected, { payload: { count: 1 } }),
    });
    const el = document.createElement('div');
    document.body.appendChild(el);
    const warn = vi.spyOn(console, 'warn');
    const error = vi.spyOn(console, 'error');
    let app: ReturnType<typeof createSSRApp> | undefined;
    try {
      el.innerHTML = await renderToString(createSSRApp(Root));
      await instances[0].unmount();
      const serverNode = el.querySelector('span');
      expect(serverNode?.textContent).toBe('1');
      isClient = true;
      app = createSSRApp(Root);
      app.mount(el);
      await flush();
      expect(instances[1].isMounted).toBe(false);
      expect(el.querySelector('span')).toBe(serverNode);
      ready();
      await flush();
      expect(instances[1].isMounted).toBe(true);
      expect(el.querySelector('span')).toBe(serverNode);
      expect(warn).not.toHaveBeenCalled();
      expect(error).not.toHaveBeenCalled();
      await instances[1].unmount();
      await flush();
      expect(el.querySelector('span')).toBeNull();
      // SSR mode still uses the mount gate for a fresh client-only subtree.
      const csr = mount(Root);
      try {
        expect(csr.el.querySelector('span')).toBeNull();
        ready();
        await flush();
        expect(csr.el.querySelector('span')?.textContent).toBe('1');
      } finally {
        csr.unmount();
      }
    } finally {
      app?.unmount();
      el.remove();
      warn.mockRestore();
      error.mockRestore();
      viewModelsConfig.mode = previousMode;
    }
  },
);
