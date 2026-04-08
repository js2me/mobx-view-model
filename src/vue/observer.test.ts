import { observable, runInAction } from 'mobx';
import { describe, expect, it, vi } from 'vitest';
import { createApp, defineComponent, h, nextTick } from 'vue';
import { observer } from './observer.js';

const mount = (root: ReturnType<typeof defineComponent>) => {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const app = createApp(root);
  app.mount(el);
  return {
    el,
    unmount: () => {
      app.unmount();
      el.remove();
    },
  };
};

const flush = async () => {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await nextTick();
};

describe('observer', () => {
  it('re-renders when setup returns a render function and a tracked observable changes', async () => {
    const state = observable({ n: 0 });

    const Comp = observer(
      defineComponent({
        setup() {
          return () => h('div', { class: 'obs-setup-fn' }, String(state.n));
        },
      }),
    );

    const { el, unmount } = mount(
      defineComponent({ setup: () => () => h(Comp) }),
    );
    await flush();

    expect(el.querySelector('.obs-setup-fn')?.textContent).toBe('0');

    runInAction(() => {
      state.n = 42;
    });
    await flush();

    expect(el.querySelector('.obs-setup-fn')?.textContent).toBe('42');
    unmount();
  });

  it('re-renders when only render() is defined and a tracked observable changes', async () => {
    const state = observable({ n: 0 });

    const Comp = observer(
      defineComponent({
        setup() {
          return undefined;
        },
        render() {
          return h('div', { class: 'obs-render-only' }, String(state.n));
        },
      }),
    );

    const { el, unmount } = mount(
      defineComponent({ setup: () => () => h(Comp) }),
    );
    await flush();

    runInAction(() => {
      state.n = 5;
    });
    await flush();

    expect(el.querySelector('.obs-render-only')?.textContent).toBe('5');
    unmount();
  });

  it('does not update the DOM after unmount when the observable changes', async () => {
    const state = observable({ n: 0 });

    const Comp = observer(
      defineComponent({
        setup() {
          return () => h('div', { class: 'obs-unmount' }, String(state.n));
        },
      }),
    );

    const { el, unmount } = mount(
      defineComponent({ setup: () => () => h(Comp) }),
    );
    await flush();
    const node = el.querySelector('.obs-unmount');
    expect(node?.textContent).toBe('0');

    unmount();

    runInAction(() => {
      state.n = 99;
    });
    await flush();

    // Reaction was disposed; detached node must not flip to 99.
    expect(node?.textContent).toBe('0');
  });

  it('invokes the original beforeUnmount hook when the component is torn down', async () => {
    const state = observable({ n: 0 });
    const beforeUnmountSpy = vi.fn();

    const Comp = observer(
      defineComponent({
        setup() {
          return () => h('div', String(state.n));
        },
        beforeUnmount: beforeUnmountSpy,
      }),
    );

    const { unmount } = mount(defineComponent({ setup: () => () => h(Comp) }));
    await flush();
    unmount();

    expect(beforeUnmountSpy).toHaveBeenCalledTimes(1);
  });

  it('invokes every function when beforeUnmount is an array', async () => {
    const state = observable({ n: 0 });
    const a = vi.fn();
    const b = vi.fn();

    const Comp = observer(
      defineComponent({
        setup() {
          return () => h('div', String(state.n));
        },
        beforeUnmount: [a, b] as unknown as () => void,
      }),
    );

    const { unmount } = mount(defineComponent({ setup: () => () => h(Comp) }));
    await flush();
    unmount();

    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });

  it('keeps the original component name on the wrapped component', () => {
    const Named = defineComponent({
      name: 'TrackedCounter',
      setup() {
        return () => h('div');
      },
    });

    const Wrapped = observer(Named);
    expect((Wrapped as any).name).toBe('TrackedCounter');
  });

  it('uses the fallback name MobxObserver when the source component has no name', () => {
    const Unnamed = defineComponent({
      setup() {
        return () => h('div');
      },
    });

    const Wrapped = observer(Unnamed);
    expect((Wrapped as any).name).toBe('MobxObserver');
  });

  it('tracks multiple observables read in the same render function', async () => {
    const a = observable({ v: 1 });
    const b = observable({ v: 2 });

    const Comp = observer(
      defineComponent({
        setup() {
          return () => h('div', { class: 'obs-multi' }, `${a.v}:${b.v}`);
        },
      }),
    );

    const { el, unmount } = mount(
      defineComponent({ setup: () => () => h(Comp) }),
    );
    await flush();
    expect(el.querySelector('.obs-multi')?.textContent).toBe('1:2');

    runInAction(() => {
      a.v = 10;
    });
    await flush();
    expect(el.querySelector('.obs-multi')?.textContent).toBe('10:2');

    runInAction(() => {
      b.v = 20;
    });
    await flush();
    expect(el.querySelector('.obs-multi')?.textContent).toBe('10:20');

    unmount();
  });

  it('keeps independent MobX subscriptions for two mounted observer instances', async () => {
    const state = observable({ x: 0, y: 0 });

    const Comp = observer(
      defineComponent({
        props: { which: { type: String, required: true } },
        setup(props) {
          return () =>
            h(
              'span',
              {
                class: props.which === 'first' ? 'obs-a' : 'obs-b',
              },
              String(props.which === 'first' ? state.x : state.y),
            );
        },
      }),
    );

    const Root = defineComponent({
      setup() {
        return () =>
          h('div', [h(Comp, { which: 'first' }), h(Comp, { which: 'second' })]);
      },
    });

    const { el, unmount } = mount(Root);
    await flush();
    expect(el.querySelector('.obs-a')?.textContent).toBe('0');
    expect(el.querySelector('.obs-b')?.textContent).toBe('0');

    runInAction(() => {
      state.x = 7;
    });
    await flush();
    expect(el.querySelector('.obs-a')?.textContent).toBe('7');
    expect(el.querySelector('.obs-b')?.textContent).toBe('0');

    runInAction(() => {
      state.y = 3;
    });
    await flush();
    expect(el.querySelector('.obs-a')?.textContent).toBe('7');
    expect(el.querySelector('.obs-b')?.textContent).toBe('3');

    unmount();
  });

  it('runs the setup render function again after a tracked observable changes', async () => {
    const state = observable({ n: 0 });
    const renderFn = vi.fn();

    const Comp = observer(
      defineComponent({
        setup() {
          return () => {
            renderFn();
            return h('div', { class: 'obs-fn-count' }, String(state.n));
          };
        },
      }),
    );

    const el = document.createElement('div');
    document.body.appendChild(el);
    const app = createApp(Comp);
    app.mount(el);
    await flush();

    const callsAfterMount = renderFn.mock.calls.length;
    expect(callsAfterMount).toBeGreaterThan(0);

    runInAction(() => {
      state.n = 1;
    });
    await flush();

    expect(renderFn.mock.calls.length).toBeGreaterThan(callsAfterMount);
    expect(el.querySelector('.obs-fn-count')?.textContent).toBe('1');
    app.unmount();
    el.remove();
  });

  it('ignores non-function entries in a beforeUnmount array', async () => {
    const state = observable({ n: 0 });
    const fn = vi.fn();

    const Comp = observer(
      defineComponent({
        setup() {
          return () => h('div', String(state.n));
        },
        beforeUnmount: [fn, null, undefined, 42, 'x'] as unknown as () => void,
      }),
    );

    const { unmount } = mount(defineComponent({ setup: () => () => h(Comp) }));
    await flush();
    unmount();

    expect(fn).toHaveBeenCalledTimes(1);
  });
});
