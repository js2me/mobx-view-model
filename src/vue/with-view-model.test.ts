import { renderToString } from '@vue/server-renderer';
import { describe, expect, it } from 'vitest';
import { createApp, createSSRApp, defineComponent, h, nextTick } from 'vue';
import { ViewModelBase, ViewModelStoreBase } from '../view-model/index.js';
import { ViewModelsProvider } from './providers.js';
import { useCreateViewModel } from './use-create-view-model.js';
import { useViewModel } from './use-view-model.js';
import { withViewModel } from './with-view-model.js';

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

describe('vue withViewModel', () => {
  it('renders fallback before mount and view after', async () => {
    class VM extends ViewModelBase<{ label: string }> {}

    const View = defineComponent({
      props: { model: { type: Object, required: true } },
      setup(props) {
        return () => h('div', `view:${(props.model as VM).payload.label}`);
      },
    });

    const Fallback = defineComponent({
      setup() {
        return () => h('div', 'fallback');
      },
    });

    const Connected = withViewModel(VM, View, { fallback: Fallback });

    const Root = defineComponent({
      setup() {
        return () => h(Connected as any, { payload: { label: 'ok' } });
      },
    });

    const { el, unmount } = mount(Root);

    expect(el.textContent).toContain('fallback');

    await flush();
    expect(el.textContent).toContain('view:ok');

    unmount();
  });

  it('uses getPayload to build payload', async () => {
    class VM extends ViewModelBase<{ title: string }> {}

    const View = defineComponent({
      props: { model: { type: Object, required: true } },
      setup(props) {
        return () => h('div', (props.model as VM).payload.title);
      },
    });

    const Connected = withViewModel(VM, View, {
      getPayload: (props: any) => ({ title: props.input }),
    });

    const Root = defineComponent({
      setup() {
        return () => h(Connected as any, { input: 'Hello' });
      },
    });

    const { el, unmount } = mount(Root);
    await flush();

    expect(el.textContent).toContain('Hello');

    unmount();
  });

  it('supports ViewModelStore lookup by class', async () => {
    class VM extends ViewModelBase<{ count: number }> {}

    const store = new ViewModelStoreBase();
    let viewModelId: string | null = null;
    let lookupId: string | null = null;

    const View = defineComponent({
      props: { model: { type: Object, required: true } },
      setup(props) {
        viewModelId = (props.model as VM).id;
        return () => h('div', 'view');
      },
    });

    const Lookup = defineComponent({
      setup() {
        const model = useViewModel(VM);
        lookupId = model.id;
        return () => h('div', 'lookup');
      },
    });

    const Connected = withViewModel(VM, View);

    const Root = defineComponent({
      setup() {
        return () =>
          h(
            ViewModelsProvider,
            { value: store },
            {
              default: () =>
                h('div', [
                  h(Connected as any, { payload: { count: 1 } }),
                  h(Lookup),
                ]),
            },
          );
      },
    });

    const { unmount } = mount(Root);
    await flush();

    expect(lookupId).toBe(viewModelId);

    unmount();
  });

  it('supports anchors via connect()', async () => {
    class VM extends ViewModelBase<{ count: number }> {}

    const store = new ViewModelStoreBase();
    let viewModelId: string | null = null;
    let anchorId: string | null = null;

    const Anchor = defineComponent({
      name: 'Anchor',
      setup() {
        const model = useViewModel(Anchor as any);
        anchorId = model.id ?? null;
        return () => h('div', 'anchor');
      },
    });

    const View = defineComponent({
      props: { model: { type: Object, required: true } },
      setup(props) {
        viewModelId = (props.model as VM).id;
        return () => h('div', 'view');
      },
    });

    const Connected = withViewModel(VM, View).connect(Anchor);

    const Root = defineComponent({
      setup() {
        return () =>
          h(
            ViewModelsProvider,
            { value: store },
            {
              default: () =>
                h('div', [
                  h(Connected as any, { payload: { count: 1 } }),
                  h(Anchor),
                ]),
            },
          );
      },
    });

    const { unmount } = mount(Root);
    await flush();

    expect(anchorId).toBe(viewModelId);

    unmount();
  });

  it('provides parentViewModel in nested views', async () => {
    class ParentVM extends ViewModelBase<{ name: string }> {}
    class ChildVM extends ViewModelBase<{ label: string }, ParentVM> {}

    let parentId: string | null = null;

    const ChildView = defineComponent({
      props: { model: { type: Object, required: true } },
      setup(props) {
        parentId = (props.model as ChildVM).parentViewModel?.id ?? null;
        return () => h('div', 'child');
      },
    });

    const ParentView = defineComponent({
      props: { model: { type: Object, required: true } },
      setup() {
        const ConnectedChild = withViewModel(ChildVM, ChildView);
        return () =>
          h('div', [
            h('span', 'parent'),
            h(ConnectedChild as any, { payload: { label: 'child' } }),
          ]);
      },
    });

    const ConnectedParent = withViewModel(ParentVM, ParentView);

    const Root = defineComponent({
      setup() {
        return () => h(ConnectedParent as any, { payload: { name: 'root' } });
      },
    });

    const { unmount } = mount(Root);
    await flush();

    expect(parentId).toBeTruthy();

    unmount();
  });

  it('comparePayload strict skips payloadChanged for same payload', async () => {
    const changes: Array<{ count: number }> = [];

    class StrictCompareVm extends ViewModelBase<{ count: number }> {
      payloadChanged(payload: { count: number }) {
        changes.push(payload);
      }
    }

    const instance: { current: ViewModelBase<{ count: number }> | null } = {
      current: null,
    };

    const Root = defineComponent({
      setup() {
        instance.current = useCreateViewModel(
          StrictCompareVm,
          { count: 1 },
          {
            vmConfig: { comparePayload: 'strict' },
          },
        );
        return () => h('div');
      },
    });

    const { unmount } = mount(Root);
    await flush();

    instance.current?.setPayload({ count: 1 });
    instance.current?.setPayload({ count: 2 });

    expect(changes).toEqual([{ count: 2 }]);

    unmount();
  });

  it('comparePayload false allows payloadChanged on same payload', async () => {
    const changes: Array<{ count: number }> = [];

    class LooseCompareVm extends ViewModelBase<{ count: number }> {
      payloadChanged(payload: { count: number }) {
        changes.push(payload);
      }
    }

    const instance: { current: ViewModelBase<{ count: number }> | null } = {
      current: null,
    };

    const Root = defineComponent({
      setup() {
        instance.current = useCreateViewModel(
          LooseCompareVm,
          { count: 1 },
          {
            vmConfig: { comparePayload: false },
          },
        );
        return () => h('div');
      },
    });

    const { unmount } = mount(Root);
    await flush();

    instance.current?.setPayload({ count: 1 });
    instance.current?.setPayload({ count: 2 });

    expect(changes.length).toBe(3);

    unmount();
  });

  it('renders ViewModelSimple with withViewModel', async () => {
    class SimpleVM {
      setPayload(_payload: any) {}
    }

    const View = defineComponent({
      props: { model: { type: Object, required: true } },
      setup() {
        return () => h('div', 'simple');
      },
    });

    const Connected = withViewModel(SimpleVM, View);

    const Root = defineComponent({
      setup() {
        return () => h(Connected as any, { payload: { count: 1 } });
      },
    });

    const { el, unmount } = mount(Root);
    await flush();

    expect(el.textContent).toContain('simple');

    unmount();
  });

  it('SSR renders fallback without store', async () => {
    class VM extends ViewModelBase<{ label: string }> {}

    const View = defineComponent({
      props: { model: { type: Object, required: true } },
      setup(props) {
        return () => h('div', `view:${(props.model as VM).payload.label}`);
      },
    });

    const Fallback = defineComponent({
      setup() {
        return () => h('div', 'fallback');
      },
    });

    const Connected = withViewModel(VM, View, { fallback: Fallback });

    const app = createSSRApp(() =>
      h(Connected as any, { payload: { label: 'ssr' } }),
    );

    const html = await renderToString(app);
    expect(html).toContain('fallback');
  });

  it('SSR renders view with preattached store instance', async () => {
    class VM extends ViewModelBase<{ label: string }> {}

    const store = new ViewModelStoreBase();
    const instance = store.createViewModel({
      VM,
      id: 'vm-ssr',
      payload: { label: 'ssr' },
      viewModels: store,
      ctx: {},
    });

    store.markToBeAttached(instance);
    await store.attach(instance);

    const View = defineComponent({
      props: { model: { type: Object, required: true } },
      setup(props) {
        return () => h('div', `view:${(props.model as VM).payload.label}`);
      },
    });

    const Connected = withViewModel(VM, View, { id: 'vm-ssr' });

    const app = createSSRApp(() =>
      h(
        ViewModelsProvider,
        { value: store },
        { default: () => h(Connected as any, { payload: { label: 'ssr' } }) },
      ),
    );

    const html = await renderToString(app);
    expect(html).toContain('view:ssr');
  });
});
