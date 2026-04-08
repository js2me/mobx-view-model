---
id: vue-ssr
title: Vue server-side rendering
sidebar_label: SSR
sidebar_position: 2
slug: /vue/ssr
---

# Server-Side Rendering (Vue)

SSR works with **ViewModelStore** and predictable hydration on the client. Keep the first server HTML aligned with what the client will render (same `payload`, same store wiring).

Vue differs from the client-only case: during `renderToString`, **`onMounted` does not run**, so `withViewModel` without a store usually shows the **fallback** until the client mounts. To SSR the real view, **pre-create and attach** the view model in the store and use a **fixed `id`** so the wrapper resolves the same instance.

## Basic pattern: shared store + stable id

```ts
import { createSSRApp, h } from 'vue';
import { renderToString } from '@vue/server-renderer';
import {
  ViewModelBase,
  ViewModelStoreBase,
} from 'mobx-view-model';
import {
  ViewModelsProvider,
  withViewModel,
} from 'mobx-view-model/vue';

class PageVM extends ViewModelBase<{ count: number }> {}

const PageView = {
  props: { model: { type: Object, required: true } },
  setup(props: any) {
    return () => h('div', `count ${props.model.payload.count}`);
  },
};

const Page = withViewModel(PageVM, PageView, { id: 'page-vm' });

export async function renderPage(count: number) {
  const vmStore = new ViewModelStoreBase();
  const instance = vmStore.createViewModel({
    VM: PageVM,
    id: 'page-vm',
    payload: { count },
    viewModels: vmStore,
    ctx: {},
  });
  vmStore.markToBeAttached(instance);
  await vmStore.attach(instance);

  const app = createSSRApp(() =>
    h(ViewModelsProvider, { value: vmStore }, () =>
      h(Page, { payload: { count } }),
    ),
  );

  return renderToString(app);
}
```

## Fallback without store (expected)

If you SSR `withViewModel` **without** `ViewModelsProvider` / pre-attached instance, the initial string render typically matches the **fallback** branch (because the model is not yet mounted). Use that for loading placeholders, or adopt the store pattern above for full content on the server.

## Async `mount()`

If `mount()` is async, the initial render can show **fallback** on both server and client until mounting completes, which helps avoid hydration mismatches.

```ts
class PageVM extends ViewModelBase {
  async mount() {
    await sleep(100);
    super.mount();
  }
}
```

::: tip Keep SSR and CSR identical

Use the same `payload` and `ViewModelStore` setup on server and client. Avoid relying on side effects inside `mount()` for the first paint of critical HTML.

:::
