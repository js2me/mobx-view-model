import { computed, observable, runInAction } from 'mobx';
import { describe, expect, it, vi } from 'vitest';
import { createApp, defineComponent, h, nextTick, onMounted, ref } from 'vue';
import { createCounter } from 'yummies/complex';
import type { EmptyObject } from 'yummies/types';
import { ViewModelBase } from '../view-model/index.js';
import { ViewModelBaseMock } from '../view-model/view-model.base.test.js';
import { observer } from './observer.js';
import { useViewModel } from './use-view-model.js';
import { withViewModel } from './with-view-model.js';

const createIdGenerator = (prefix?: string) =>
  createCounter((counter) => `${prefix ?? ''}${counter}`);

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

describe('vue MobX reactivity', () => {
  it('observer re-renders when tracked observable changes', async () => {
    const state = observable({ n: 0 });

    const Comp = observer(
      defineComponent({
        setup() {
          return () => h('div', { class: 'mobx-n' }, String(state.n));
        },
      }),
    );

    const Root = defineComponent({
      setup() {
        return () => h(Comp);
      },
    });

    const { el, unmount } = mount(Root);
    await flush();

    expect(el.querySelector('.mobx-n')?.textContent).toBe('0');

    runInAction(() => {
      state.n = 7;
    });
    await flush();

    expect(el.querySelector('.mobx-n')?.textContent).toBe('7');

    unmount();
  });

  it('observer with render option tracks observables', async () => {
    const state = observable({ n: 0 });

    const Comp = observer(
      defineComponent({
        render() {
          return h('div', { class: 'mobx-render' }, String(state.n));
        },
      }),
    );

    const Root = defineComponent({
      setup() {
        return () => h(Comp);
      },
    });

    const { el, unmount } = mount(Root);
    await flush();

    runInAction(() => {
      state.n = 2;
    });
    await flush();

    expect(el.querySelector('.mobx-render')?.textContent).toBe('2');

    unmount();
  });

  it('withViewModel: view shows actual payload when wrapViewsInObserver is true', async () => {
    class VM extends ViewModelBaseMock<{ counter: number }> {}

    const View = defineComponent({
      props: { model: { type: Object, required: true } },
      setup(props) {
        return () =>
          h(
            'span',
            { class: 'vm-counter' },
            String((props.model as VM).payload.counter),
          );
      },
    });

    const Connected = withViewModel(VM, View, {
      generateId: createIdGenerator('r-'),
    });

    const Root = defineComponent({
      setup() {
        const counter = ref(0);
        return () =>
          h('div', [
            h(
              'button',
              {
                class: 'inc',
                onClick: () => {
                  counter.value += 1;
                },
              },
              '+',
            ),
            h(Connected, { payload: { counter: counter.value } }),
          ]);
      },
    });

    const { el, unmount } = mount(Root);
    await flush();

    expect(el.querySelector('.vm-counter')?.textContent).toBe('0');

    (el.querySelector('.inc') as HTMLButtonElement).click();
    await flush();
    (el.querySelector('.inc') as HTMLButtonElement).click();
    await flush();
    (el.querySelector('.inc') as HTMLButtonElement).click();
    await flush();

    expect(el.querySelector('.vm-counter')?.textContent).toBe('3');

    unmount();
  });

  it('withViewModel: ViewModelBaseMock with observable + computed updates the view', async () => {
    class VM extends ViewModelBaseMock<{ counter: number }> {
      readonly factors = observable({ multiplier: 2 });

      readonly scaledCount = computed(
        () => this.factors.multiplier * this.payload.counter,
      );
    }

    const View = defineComponent({
      props: { model: { type: Object, required: true } },
      setup(props) {
        const vmFromContext = useViewModel() as VM;
        onMounted(() => {
          expect(vmFromContext).toBe(props.model as VM);
        });
        return () => {
          const m = props.model as VM;
          return h('div', { class: 'vm-derived' }, [
            h('span', { class: 'scaled' }, String(m.scaledCount.get())),
            h('span', { class: 'mult' }, String(m.factors.multiplier)),
            h(
              'button',
              {
                class: 'inc-mult',
                onClick: () => {
                  runInAction(() => {
                    vmFromContext.factors.multiplier += 1;
                  });
                },
              },
              '+m',
            ),
          ]);
        };
      },
    });

    const Connected = withViewModel(VM, View, {
      generateId: createIdGenerator('r-obs-comp-'),
    });

    const Root = defineComponent({
      setup() {
        const counter = ref(0);
        return () =>
          h('div', [
            h(
              'button',
              {
                class: 'inc-counter',
                onClick: () => {
                  counter.value += 1;
                },
              },
              '+c',
            ),
            h(Connected, { payload: { counter: counter.value } }),
          ]);
      },
    });

    const { el, unmount } = mount(Root);
    await flush();

    expect(el.querySelector('.scaled')?.textContent).toBe('0');
    expect(el.querySelector('.mult')?.textContent).toBe('2');

    (el.querySelector('.inc-counter') as HTMLButtonElement).click();
    await flush();
    expect(el.querySelector('.scaled')?.textContent).toBe('2');
    expect(el.querySelector('.mult')?.textContent).toBe('2');

    (el.querySelector('.inc-mult') as HTMLButtonElement).click();
    await flush();
    expect(el.querySelector('.scaled')?.textContent).toBe('3');
    expect(el.querySelector('.mult')?.textContent).toBe('3');

    (el.querySelector('.inc-counter') as HTMLButtonElement).click();
    await flush();
    expect(el.querySelector('.scaled')?.textContent).toBe('6');

    unmount();
  });

  it('withViewModel: without observer, view ignores setPayload when Vue parent does not re-render', async () => {
    class StalePayloadVm extends ViewModelBaseMock<{ counter: number }> {}

    let staleVmRef: StalePayloadVm | null = null;

    const View = defineComponent({
      props: { model: { type: Object, required: true } },
      setup(props) {
        staleVmRef = props.model as StalePayloadVm;
        return () =>
          h(
            'span',
            { class: 'vm-counter' },
            String((props.model as StalePayloadVm).payload.counter),
          );
      },
    });

    const Connected = withViewModel(StalePayloadVm, View, {
      generateId: createIdGenerator('r2-'),
      vmConfig: { wrapViewsInObserver: false },
    });

    const payload = ref({ counter: 0 });

    const Root = defineComponent({
      setup() {
        return () =>
          h('div', [
            h(
              'button',
              {
                class: 'mobx-only',
                onClick: () => {
                  const vm = staleVmRef;
                  if (!vm) return;
                  vm.setPayload({ counter: vm.payload.counter + 1 });
                },
              },
              'mobx',
            ),
            h(Connected, { payload: payload.value }),
          ]);
      },
    });

    const { el, unmount } = mount(Root);
    await flush();

    expect(el.querySelector('.vm-counter')?.textContent).toBe('0');

    (el.querySelector('.mobx-only') as HTMLButtonElement).click();
    await flush();

    expect(
      (staleVmRef as ViewModelBaseMock<{ counter: number }> | null)?.payload
        .counter,
    ).toBe(1);
    expect(el.querySelector('.vm-counter')?.textContent).toBe('0');

    unmount();
  });

  it('withViewModel: view re-renders when VM MobX field changes (observer + action)', async () => {
    class VM extends ViewModelBase<EmptyObject, null> {
      readonly ui = observable({ ticks: 0 });

      inc() {
        runInAction(() => {
          this.ui.ticks += 1;
        });
      }
    }

    const View = defineComponent({
      props: { model: { type: Object, required: true } },
      setup(props) {
        return () =>
          h('div', [
            h(
              'button',
              {
                class: 'tick',
                onClick: () => (props.model as VM).inc(),
              },
              'tick',
            ),
            h('span', { class: 'ticks' }, String((props.model as VM).ui.ticks)),
          ]);
      },
    });

    const Connected = withViewModel(VM, View, {
      generateId: createIdGenerator('r3-'),
    });

    const Root = defineComponent({
      setup() {
        return () => h(Connected, { payload: {} });
      },
    });

    const { el, unmount } = mount(Root);
    await flush();

    expect(el.querySelector('.ticks')?.textContent).toBe('0');

    (el.querySelector('.tick') as HTMLButtonElement).click();
    await flush();

    expect(el.querySelector('.ticks')?.textContent).toBe('1');

    unmount();
  });

  it('withViewModel: observer re-runs view render when payload updates (render spy)', async () => {
    class VM extends ViewModelBaseMock<{ counter: number }> {}

    const renderSpy = vi.fn();

    const View = defineComponent({
      props: { model: { type: Object, required: true } },
      setup(props) {
        return () => {
          renderSpy();
          return h(
            'span',
            { class: 'vm-counter' },
            String((props.model as VM).payload.counter),
          );
        };
      },
    });

    const Connected = withViewModel(VM, View, {
      generateId: createIdGenerator('r4-'),
    });

    const Root = defineComponent({
      setup() {
        const counter = ref(0);
        return () =>
          h('div', [
            h(
              'button',
              {
                class: 'inc',
                onClick: () => {
                  counter.value += 1;
                },
              },
              '+',
            ),
            h(Connected, { payload: { counter: counter.value } }),
          ]);
      },
    });

    const { el, unmount } = mount(Root);
    await flush();

    const initialSpyCount = renderSpy.mock.calls.length;

    (el.querySelector('.inc') as HTMLButtonElement).click();
    await flush();
    (el.querySelector('.inc') as HTMLButtonElement).click();
    await flush();
    (el.querySelector('.inc') as HTMLButtonElement).click();
    await flush();

    expect(el.querySelector('.vm-counter')?.textContent).toBe('3');
    expect(renderSpy.mock.calls.length).toBeGreaterThan(initialSpyCount);

    unmount();
  });
});
