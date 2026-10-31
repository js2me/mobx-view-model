# Server-Side Rendering (Vue)

Set `viewModelsConfig.mode = 'ssr'` at application startup to let Vue await model mounting through `onServerPrefetch`. This works with synchronous and asynchronous `mount()` implementations, with or without a store. In the default `csr-only` mode, unmounted models render the fallback on the server.

Create a separate store for each request. Use stable IDs and identical payloads on server and client when hydrating.

```ts
import { createSSRApp, h } from 'vue';
import { renderToString } from '@vue/server-renderer';
import { ViewModelBase, ViewModelStoreBase, viewModelsConfig } from 'mobx-view-model';
import { ViewModelsProvider, withViewModel } from 'mobx-view-model-vue';

viewModelsConfig.mode = 'ssr';
class PageVM extends ViewModelBase<{ count: number }> {}
const Page = withViewModel(PageVM, {
  props: { model: { type: Object, required: true } },
  setup(props: any) {
    return () => h('div', `count ${props.model.payload.count}`);
  },
}, { id: 'page-vm' });

export async function renderPage(count: number) {
  const store = new ViewModelStoreBase();
  try {
    return await renderToString(createSSRApp(() =>
      h(ViewModelsProvider, { value: store }, () =>
        h(Page, { payload: { count } }),
      ),
    ));
  } finally {
    // Vue does not run unmount hooks during SSR. Dispose request-owned models.
    for (const model of store.getAll(PageVM)) await store.unmount(model);
    store.clean();
  }
}
```

If you pre-create a model, use `store.define(config)` and `await model.mount()`. The wrapper reuses a registered model with the same ID.

Vue 3.5 or newer is required for `useId()`, which supplies per-application IDs compatible with hydration. Use the same app `idPrefix` on server and client.

For request stores containing multiple model classes, track every created model and unmount each before clearing the store indexes. `getAll` requires a class, ID, or anchor lookup; `getAll(null)` returns an empty array.
