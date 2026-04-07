---
id: ssr
title: Server-Side Rendering (Next.js)
sidebar_label: SSR
sidebar_position: 2
slug: /react/ssr
---

# Server-Side Rendering

`mobx-view-model` supports **SSR** together with [`ViewModelStore`](/api/view-model-store/interface) and predictable **hydration** on the client. The HTML from the server and the first client render must be **the same** (same `payload`, same store wiring, same tree).

This page is a **step-by-step** recipe for **Next.js** using the reference app in [`examples/ssr-nextjs`](https://github.com/js2me/mobx-view-model/tree/master/examples/ssr-nextjs) (**Pages Router**, `getServerSideProps`). The same ideas apply to the **App Router**: keep a **client** boundary for hooks (`withViewModel`, `useCreateViewModel`, `useViewModel`), load data where Next allows, and pass **serializable** props into that tree.

::: warning React Server Components and `"use server"`
Hooks from this library run only in **client components**. You cannot use them inside Server Components or `"use server"` modules. Fetch on the server, then pass results as props into a client subtree wrapped in [`ViewModelsProvider`](/react/api/view-models-provider).
:::

---

## Step 1 — Dependencies

Install **MobX**, **mobx-react-lite**, and **mobx-view-model** (from npm or a local `file:` build, as in the monorepo example).

---

## Step 2 — `next.config`

1. **`transpilePackages`** — include `mobx-view-model` so Next compiles the package (needed for many setups).

2. **`reactStrictMode: false`** — in **development**, Strict Mode double-invokes effects and remounts. That can break view-model **lifecycle / reference counting** tied to `useLayoutEffect`. For a stable VM lifecycle during local SSR debugging, turn Strict Mode off (the example documents this explicitly).

```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['mobx-view-model'],
  reactStrictMode: false,
};

export default nextConfig;
```

---

## Step 3 — One-time MobX setup for SSR (`enableStaticRendering`)

On the **server**, MobX reactions inside `observer` must not run like in the browser. Call **`enableStaticRendering`** from `mobx-react-lite` once, before any React render, and set MobX **`configure`** as you prefer.

Use a small client-only module and import it **at the top** of your client root (e.g. `_app.tsx` with `'use client'`):

```ts
import { configure } from 'mobx';
import { enableStaticRendering } from 'mobx-react-lite';

configure({ enforceActions: 'always' });

enableStaticRendering(typeof window === 'undefined');
```

Reference: `examples/ssr-nextjs/src/bootstrap/client.ts`.

---

## Step 4 — `ViewModelStore` inside a root store

Subclass [`ViewModelStoreBase`](/api/view-model-store/base-implementation) (or implement [`ViewModelStore`](/api/view-model-store/interface)) and hang it on your app **root store**. Override **`createViewModel`** if every VM should receive `rootStore` (same pattern as [Integration with RootStore](/recipes/integration-with-root-store)).

Expose a provider that combines **your** React context with [`ViewModelsProvider`](/react/api/view-models-provider):

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

Reference: `examples/ssr-nextjs/src/stores/root-store/` and `src/shared/lib/vm-store.ts`.

---

## Step 5 — Client `_app` and a **single** `RootStore` per load

Next.js does **not** support `getServerSideProps` on `_app`. The usual pattern:

1. Define a **serializable** snapshot type for data that must match server → client (e.g. `appInfo`, user session summary).
2. In **each** page’s `getServerSideProps`, merge that snapshot into `props` (helper `mergeRootStorePageProps` in the example).
3. In `_app`, read `pageProps.rootStoreSnapshot`, then create **one** `RootStore` with `useState(() => new RootStore(...))` so the instance survives navigations but is not recreated every render.

Wrap the app with your HOC (e.g. `withRootStore`) that:

- builds `new RootStore({ ...snapshot, router })` (router from `useRouter()` on the client is fine for non-serialized context),
- renders `RootStoreProvider`.

Routes **without** `getServerSideProps` (e.g. static error pages) may omit `rootStoreSnapshot` — fall back to defaults that match your server merge helper.

Reference: `examples/ssr-nextjs/src/pages/_app.tsx`, `src/stores/root-store/components/with-root-store.tsx`, `src/shared/lib/root-store-server-props.ts`.

---

## Step 6 — Page: load data on the server, pass props to a client tree

In `getServerSideProps`, await your data (DB, API, etc.), then return:

```ts
return {
  props: mergeRootStorePageProps({
    initialPayload: await loadPagePayload(),
  }),
};
```

The **page** component (can stay a server-friendly default export without `'use client'`) receives `initialPayload` and passes it into a **client** component that uses `withViewModel` / hooks.

Reference: `examples/ssr-nextjs/src/pages/index.tsx`, `src/pages/widgets/index.tsx`, `src/pages/timeline/index.tsx`.

---

## Step 7 — Client UI: `withViewModel`, `id`, `fallback`, `observer`

1. Mark the file **`'use client'`** when using [`withViewModel`](/react/api/with-view-model) or hooks.
2. Pass **`payload`** from the page so server and client use the **same** object shape.
3. Give each logical screen a stable **`id`** if several pages use the same VM class — otherwise instances collide in the store (`demo-widgets-vm` vs `demo-timeline-vm` in the example).
4. Provide **`fallback`** if [`mount()`](/api/view-models/interface) is **async** — first paint shows fallback on both server and client, avoiding hydration mismatches ([warning #2](/warnings/2)).
5. Child components that read the VM should use [`useViewModel`](/react/api/use-view-model) and be wrapped in **`observer`** from `mobx-react-lite`.

Reference: `examples/ssr-nextjs/src/components/demo-page-client/`, `src/components/pages/widgets-demo-client.tsx`.

---

## How this ties to `attach` and the first paint

React does not run `useLayoutEffect` / `useEffect` during the **server** render. [`useCreateViewModel`](/react/api/use-create-view-model) therefore calls **`attach`** during the **first render** when the VM is not yet in the store (and calls `mount()` synchronously when there is no store), so server HTML aligns with the first client paint after hydration. The layout effect path still handles `attach` when the instance was not registered yet, keeping reference counting correct.

Custom `ViewModelStore` implementations should mirror [`ViewModelStoreBase.attach`](/api/view-model-store/base-implementation): **synchronous** `mount()` must finish in the same turn, or SSR output may not match the main view until the client.

---

## Minimal standalone pattern (any SSR runtime)

Shared store + same payload on server and client:

```tsx
import { ViewModelBase, ViewModelsProvider, ViewModelStoreBase, withViewModel } from 'mobx-view-model';

class PageVM extends ViewModelBase<{ count: number }> {}

const Page = withViewModel(
  PageVM,
  ({ model }) => <div>{`count ${model.payload.count}`}</div>,
);

export const renderPage = (count: number) => {
  const vmStore = new ViewModelStoreBase();
  return (
    <ViewModelsProvider value={vmStore}>
      <Page payload={{ count }} />
    </ViewModelsProvider>
  );
};
```

Client-only hydration (same payload and store wiring):

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

If `mount()` is async, the initial render shows **`fallback`** on both server and client, which avoids hydration mismatches.

```tsx
class PageVM extends ViewModelBase {
  async mount() {
    await sleep(100);
    super.mount();
  }
}
```

::: tip Keep SSR and CSR identical
Use the same **`payload`** and **`ViewModelsProvider`** / store setup on server and client. Do not rely on side effects inside `mount()` for the first paint.
:::
