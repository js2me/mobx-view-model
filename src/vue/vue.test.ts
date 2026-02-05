import { describe, expect, it } from 'vitest';
import { createApp, defineComponent, h, isRef, nextTick, ref } from 'vue';
import { ViewModelBase } from '../view-model/index.js';
import { ActiveViewModelProvider } from './providers.js';
import { useCreateViewModel } from './use-create-view-model.js';
import { useViewModel } from './use-view-model.js';
import { withViewModel } from './with-view-model.js';

const mount = (root: ReturnType<typeof defineComponent>) => {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const app = createApp(root);
  app.mount(el);
  return {
    unmount: () => {
      app.unmount();
      el.remove();
    },
  };
};

describe('vue integration', () => {
  it('useCreateViewModel updates payload for ViewModelSimple', async () => {
    const payloads: any[] = [];
    class SimpleVm {
      setPayload(payload: any) {
        payloads.push(payload);
      }
    }

    const payload = { count: 1 };

    const Root = defineComponent({
      setup() {
        useCreateViewModel(SimpleVm, payload);
        return () => h('div');
      },
    });

    const { unmount } = mount(Root);
    await nextTick();

    expect(isRef(payloads[0])).toBe(true);
    expect((payloads[0] as any)?.value).toEqual({ count: 1 });

    (payloads[0] as any).value = { count: 2 };
    await nextTick();

    expect(payloads.at(-1)).toBe(payloads[0]);
    expect((payloads.at(-1) as any)?.value).toEqual({ count: 2 });

    unmount();
  });

  it('useCreateViewModel updates payload for ViewModelBase', async () => {
    const payloadChanges: Array<{ count: number }> = [];
    class BaseVm extends ViewModelBase<{ count: number }> {
      payloadChanged(payload: { count: number }) {
        payloadChanges.push(payload);
      }
    }

    const payload = ref({ count: 1 });

    const Root = defineComponent({
      setup() {
        useCreateViewModel(BaseVm, payload);
        return () => h('div');
      },
    });

    const { unmount } = mount(Root);
    await nextTick();

    expect(payloadChanges[0]).toEqual({ count: 1 });

    payload.value = { count: 2 };
    await nextTick();

    expect(payloadChanges.at(-1)).toEqual({ count: 2 });

    unmount();
  });

  it('useViewModel returns active view model when no lookup', async () => {
    class SimpleVm {}
    let active: SimpleVm | null = null;
    let created: SimpleVm | null = null;

    const Child = defineComponent({
      setup() {
        active = useViewModel();
        return () => h('div');
      },
    });

    const Root = defineComponent({
      setup() {
        created = new SimpleVm();
        return () =>
          h(
            ActiveViewModelProvider,
            { value: created! },
            { default: () => h(Child) },
          );
      },
    });

    const { unmount } = mount(Root);
    await nextTick();

    expect(active).toBe(created);

    unmount();
  });

  it('withViewModel passes model and payload', async () => {
    class SimpleVm {
      payload?: any;
      setPayload(payload: any) {
        this.payload = payload;
      }
    }

    let receivedPayload: any;

    const View = defineComponent({
      name: 'View',
      props: {
        model: {
          type: Object,
          required: true,
        },
        value: {
          type: String,
          required: false,
        },
      },
      setup(props) {
        receivedPayload = (props.model as SimpleVm).payload;
        return () => h('div');
      },
    });

    const Connected = withViewModel(SimpleVm, View, {
      getPayload: (allProps: any) => ({ foo: allProps.value }),
    });

    const Root = defineComponent({
      setup() {
        return () => h(Connected as any, { value: 'bar' });
      },
    });

    const { unmount } = mount(Root);
    await nextTick();

    expect(isRef(receivedPayload)).toBe(true);
    expect(receivedPayload?.value).toEqual({ foo: 'bar' });

    unmount();
  });
});
