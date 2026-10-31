# Example: Next.js (Pages Router) + SSR + mobx-view-model

Matches the walkthrough in [`docs/react/ssr.md`](../../docs/react/ssr.md).

- **Pages Router** with **`getServerSideProps`**. Each data page wraps its handler in **`withRootStoreProps`** so `pageProps.rootStoreSnapshot` includes server-built **`appInfo`**. **`_app`** uses **`withRootStore`**, which creates one **`RootStore`** from the snapshot; *in this example* it also merges **`router`** from **`useRouter()`** (optional pattern, not required by the library). Static routes (**`/404`**, **`/500`**) have no snapshot — **`appInfo`** is omitted and **`AppInfoStore`** uses its **constructor defaults**.
- **`RootStoreSnapshot`** has optional **`appInfo`** / **`router`** on the wire; **`getRootStoreSnapshot()`** (`src/stores/root-store/snapshot.ts`, demo **`sleep(50)`** via **`yummies/async`**) delegates to **`getAppInfoStoreSnapshot()`** in `src/stores/app-info-store/snapshot.ts`.
- **`enableStaticRendering`** and **`configure`** run once from [`src/bootstrap/client.ts`](https://github.com/js2me/mobx-view-model/blob/master/examples/ssr-nextjs/src/bootstrap/client.ts), imported at the top of **`src/pages/_app.tsx`**.
- Demo routes use **`withViewModel`**, stable **`id`** per screen, **`fallback`**, and **`observer`** + **`useViewModel`** to verify hydration.

The package is **standalone** (no `pnpm-workspace`): `mobx-view-model` is linked via **`file:../../dist`**. Build the library first so `dist/` exists.

## Run

1. Repo root: `pnpm install` and **`pnpm build`** (produces **`dist/`**).

2. Example folder:

   ```bash
   cd examples/ssr-nextjs
   pnpm install
   pnpm dev
   ```

   After changing the library: `pnpm build` at the root, then **`pnpm install`** in the example.

From repo root (after `pnpm install` in `examples/ssr-nextjs`):

```bash
pnpm example:ssr
```

Open [http://localhost:3010](http://localhost:3010).

Production (from root; includes library build):

```bash
pnpm example:ssr:build
cd examples/ssr-nextjs && pnpm start
```

If `dist/` is already built (e.g. CI): **`pnpm example:ssr:build:example`** installs example deps and runs `next build` only.

## Layout

| Path | Role |
|------|------|
| `next.config.ts` | `reactStrictMode: false`; **`transpilePackages: ['mobx-view-model']`** only because the example uses **`file:../../dist`** — drop it when you depend on the published npm package. |
| [`src/bootstrap/client.ts`](https://github.com/js2me/mobx-view-model/blob/master/examples/ssr-nextjs/src/bootstrap/client.ts) | `configure`, `enableStaticRendering` |
| `src/pages/_app.tsx` | Client app shell, `withRootStore` |
| `src/pages/_document.tsx` | HTML document |
| `src/stores/root-store/index.ts` | `RootStore`, `RootStoreSnapshot` type |
| `src/stores/root-store/snapshot.ts` | `getRootStoreSnapshot()` for SSR props |
| `src/stores/root-store/lib/with-root-store-props.ts` | `withRootStoreProps`, `WithRootStorePageProps` |
| `src/stores/root-store/components/with-root-store.tsx` | HOC: one `RootStore` per load; example merges snapshot + `router` from `useRouter` |
| `src/stores/root-store/components/provider.tsx` | `RootStoreProvider` + `ViewModelsProvider` |
| `src/stores/app-info-store/snapshot.ts` | `getAppInfoStoreSnapshot` for SSR snapshot |
| `src/shared/lib/vm-store.ts` | `ViewModelStoreBase` subclass |
| `src/pages/index.tsx` (and `widgets`, `timeline`, `about`) | `getServerSideProps` + demo UI |

## Note

If **`dist/`** is missing, `pnpm install` in the example may fail. After each library rebuild, run **`pnpm install`** again inside the example.
