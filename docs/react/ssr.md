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

- **`reactStrictMode: false`** — in dev, React Strict Mode double-mounts components. This library creates / mounts VMs during render and cleans them up in effects (`define` / `unmountNew`), so the extra cycle can **surface bugs** (wrong VM instances or counts). Turn Strict Mode off while debugging SSR if you see that.

```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
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

::: tip App Router vs Pages Router
The sample app uses the **Pages** router and imports this bootstrap from a **client** [`_app`](https://github.com/js2me/mobx-view-model/blob/master/examples/ssr-nextjs/src/pages/_app.tsx). With the **App** router, put `configure` / `enableStaticRendering` in a small module marked with **`'use client'`** and import it from your client root layout (or another client entry), so the same code runs during SSR and in the browser.
:::

---

## 3. Root store + `ViewModelsProvider`

Put a [`ViewModelStoreBase`](/api/view-model-store/base-implementation) (or custom store) on your app root. If every VM needs `rootStore`, override **`create`** — see [Integration with RootStore](/recipes/integration-with-root-store).

Set [`viewModelsConfig.mode = 'ssr'`](/api/view-models/view-models-config#mode) (or pass `vmConfig` on the store) so async mount is waited with React `use()` during SSR / hydration.

Wrap the tree with your context and [`ViewModelsProvider`](/react/api/view-models-provider):

```tsx
import { ViewModelsProvider } from 'mobx-view-model-react';

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
4. If **`mount()` / `willMount()`** is **async**, set **`fallback`** (and/or a `Suspense` boundary in `'ssr'` mode) so the first server and client paint match.
5. Deep children: [`useViewModel`](/react/api/use-view-model) + **`observer`**.

**Why the first paint can match:** during the server HTML pass, React does not run `useEffect`. [`useCreateViewModel`](/react/api/use-create-view-model) (and [`withViewModel`](/react/api/with-view-model), which uses it) calls [`define()`](/api/view-model-store/interface#define) **during render** and starts `mount()` in the same turn. When mount finishes **synchronously**, `isMounted` becomes `true` and the main view can render immediately. If mount returns a **`Promise`** and [`mode`](/api/view-models/view-models-config#mode) is `'ssr'`, the hook waits with React `use()` so SSR / hydration stay aligned; without waiting UI you should still provide **`fallback`** / `Suspense`.

---

## Minimal pattern (any SSR stack)

Same store + same payload on server and client:

```tsx
import { ViewModelBase, ViewModelStoreBase, viewModelsConfig } from 'mobx-view-model';
import { ViewModelsProvider, withViewModel } from 'mobx-view-model-react';

viewModelsConfig.mode = 'ssr';

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

Hydration on the client (same wiring — use the **same** `Page` component and the **same** `payload` values as on the server so the tree matches):

```tsx
import { ViewModelStoreBase } from 'mobx-view-model';
import { ViewModelsProvider } from 'mobx-view-model-react';
import { hydrateRoot } from 'react-dom/client';
// import { Page } from './page';

const vmStore = new ViewModelStoreBase();

hydrateRoot(
  document.getElementById('app')!,
  <ViewModelsProvider value={vmStore}>
    <Page payload={{ count: 1 }} />
  </ViewModelsProvider>,
);
```

---

## Async `mount()` / `willMount()`

Prefer async work in [`willMount()`](/api/view-models/base-implementation#willmount-void). Use **`fallback`** (and `Suspense` when `mode: 'ssr'`) for the initial render on server and client:

```tsx
import { sleep } from "yummies/async";

class PageVM extends ViewModelBase {
  protected async willMount() {
    await sleep(100);
  }
}
```

Pass a `fallback` component in [`withViewModel` config](/react/api/with-view-model#fallback) (or set [`viewModelsConfig.fallbackComponent`](/api/view-models/view-models-config#fallbackcomponent)) so both server and client render that UI until mount completes.

::: tip Same data everywhere
Reuse the same **`payload`** and the same **`ViewModelsProvider`** / store wiring on server and client. Do not depend on `mount()` side effects for the first paint.
:::
