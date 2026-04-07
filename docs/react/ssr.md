---
id: ssr
title: Server-Side Rendering (Next.js)
sidebar_label: SSR
sidebar_position: 2
slug: /react/ssr
---

# Server-Side Rendering

SSR works with a [`ViewModelStore`](/api/view-model-store/interface) and normal client **hydration**. The rule that matters: **the first server HTML and the first client render must match** (same props/payload, same provider tree).

Below is a **Next.js (Pages Router)** checklist. A working layout lives in [`examples/ssr-nextjs`](https://github.com/js2me/mobx-view-model/tree/master/examples/ssr-nextjs). For the **App Router**, keep the same idea: load data on the server, pass **serializable** props into a **client** subtree that uses [`ViewModelsProvider`](/react/api/view-models-provider) and your hooks/HOCs.

::: warning Client components only
[`withViewModel`](/react/api/with-view-model), [`useCreateViewModel`](/react/api/use-create-view-model), and [`useViewModel`](/react/api/use-view-model) use React hooks. They belong in **client components**, not in Server Components or `"use server"` modules.
:::

---

## 1. `next.config`

- **`transpilePackages: ['mobx-view-model']`** — so Next compiles the library.
- **`reactStrictMode: false`** — in dev, Strict Mode remounts components; that can interfere with view-model lifecycle tied to effects. Turn it off if you hit double mount issues while developing SSR.

```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['mobx-view-model'],
  reactStrictMode: false,
};

export default nextConfig;
```

---

## 2. MobX on the server: `enableStaticRendering`

On the server, `observer` should not run reactions like in the browser. Run once before rendering (e.g. import at the top of client `_app`):

```ts
import { configure } from 'mobx';
import { enableStaticRendering } from 'mobx-react-lite';

configure({ enforceActions: 'always' });
enableStaticRendering(typeof window === 'undefined');
```

Example: [`examples/ssr-nextjs/src/bootstrap/client.ts`](https://github.com/js2me/mobx-view-model/blob/master/examples/ssr-nextjs/src/bootstrap/client.ts).

---

## 3. Root store + `ViewModelsProvider`

Put a [`ViewModelStoreBase`](/api/view-model-store/base-implementation) (or custom store) on your app root. If every VM needs `rootStore`, override **`createViewModel`** — see [Integration with RootStore](/recipes/integration-with-root-store).

Wrap the tree with your context and [`ViewModelsProvider`](/react/api/view-models-provider):

```tsx
import { ViewModelsProvider } from 'mobx-view-model';

export function RootStoreProvider({ store, children }: { store: RootStore; children: React.ReactNode }) {
  return (
    <RootStoreContext.Provider value={store}>
      <ViewModelsProvider value={store.viewModels}>{children}</ViewModelsProvider>
    </RootStoreContext.Provider>
  );
}
```

Example: [`examples/ssr-nextjs/src/stores/root-store/`](https://github.com/js2me/mobx-view-model/tree/master/examples/ssr-nextjs/src/stores/root-store), [`examples/ssr-nextjs/src/shared/lib/vm-store.ts`](https://github.com/js2me/mobx-view-model/blob/master/examples/ssr-nextjs/src/shared/lib/vm-store.ts).

---

## 4. `_app`, one `RootStore`, and page data

**`getServerSideProps` cannot live on `_app`.** Typical split:

**Snapshot** — JSON-safe fields you pass from the server (e.g. `appInfo`). Optional fields are fine: static pages like **`/404`** may not send a snapshot; your domain stores can fall back to defaults.

**`withRootStoreProps`** — wraps each page’s `getServerSideProps` and adds **`rootStoreSnapshot`** (built on the server, e.g. `getRootStoreSnapshot()` in the example).

**`withRootStore` (around `_app`)** — holds **one** root store for the lifetime of that load and merges the server snapshot with any **client-only** fields your root store needs. *In the example repo*, that includes **`router`** from **`useRouter()`** — not a framework requirement, just one way to expose the Pages Router to the store.

Example files: [`pages/_app.tsx`](https://github.com/js2me/mobx-view-model/blob/master/examples/ssr-nextjs/src/pages/_app.tsx), [`with-root-store.tsx`](https://github.com/js2me/mobx-view-model/blob/master/examples/ssr-nextjs/src/stores/root-store/components/with-root-store.tsx), [`with-root-store-props.ts`](https://github.com/js2me/mobx-view-model/blob/master/examples/ssr-nextjs/src/stores/root-store/lib/with-root-store-props.ts), [`snapshot.ts`](https://github.com/js2me/mobx-view-model/blob/master/examples/ssr-nextjs/src/stores/root-store/snapshot.ts), [`app-info-store/snapshot.ts`](https://github.com/js2me/mobx-view-model/blob/master/examples/ssr-nextjs/src/stores/app-info-store/snapshot.ts) (under [`examples/ssr-nextjs/src/`](https://github.com/js2me/mobx-view-model/tree/master/examples/ssr-nextjs/src)).

---

## 5. Page: `getServerSideProps` + props into client UI

```ts
export const getServerSideProps = withRootStoreProps(async () => ({
  props: {
    initialPayload: await loadPagePayload(),
  },
}));
```

The page module can stay without `'use client'`; pass `initialPayload` into a **client** component that uses `withViewModel` / hooks.

---

## 6. Client screen: `withViewModel`, `id`, `fallback`, `observer`

1. **`'use client'`** where you use the library’s hooks/HOCs.
2. Pass the same **`payload`** (or props) on server and client.
3. Use a stable **`id`** per route if several pages share one VM class — avoids collisions in the store.
4. If **`mount()`** is **async**, set **`fallback`** so the first server and client paint match ([warning #2](/warnings/2)).
5. Deep children: [`useViewModel`](/react/api/use-view-model) + **`observer`**.

**Why the first paint matches:** on the server, React does not run `useLayoutEffect` / `useEffect`. [`useCreateViewModel`](/react/api/use-create-view-model) runs **`attach`** during that first render when needed so the VM is ready for the same markup after hydration. Custom stores should follow [`ViewModelStoreBase.attach`](/api/view-model-store/base-implementation): **`mount()` must finish synchronously** in the sync path, or SSR and the main view can diverge.

---

## Minimal pattern (any SSR stack)

Same store + same payload on server and client:

```tsx
import { ViewModelBase, ViewModelsProvider, ViewModelStoreBase, withViewModel } from 'mobx-view-model';

class PageVM extends ViewModelBase<{ count: number }> {}

const Page = withViewModel(
  PageVM,
  ({ model }) => <div>{`count ${model.payload.count}`}</div>,
);

export function renderPage(count: number) {
  const vmStore = new ViewModelStoreBase();
  return (
    <ViewModelsProvider value={vmStore}>
      <Page payload={{ count }} />
    </ViewModelsProvider>
  );
}
```

Hydration on the client (same wiring):

```tsx
import { ViewModelStoreBase, ViewModelsProvider } from 'mobx-view-model';
import { hydrateRoot } from 'react-dom/client';

const vmStore = new ViewModelStoreBase();

hydrateRoot(
  document.getElementById('app')!,
  <ViewModelsProvider value={vmStore}>
    <Page payload={{ count: 1 }} />
  </ViewModelsProvider>,
);
```

---

## Async `mount()`

Use **`fallback`** for the initial render on server and client:

```tsx
class PageVM extends ViewModelBase {
  async mount() {
    await sleep(100);
    super.mount();
  }
}
```

::: tip Same data everywhere
Reuse the same **`payload`** and the same **`ViewModelsProvider`** / store wiring on server and client. Do not depend on `mount()` side effects for the first paint.
:::
