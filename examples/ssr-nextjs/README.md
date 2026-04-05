# Example: Next.js (App Router) + SSR + mobx-view-model

Demonstrates the setup described in `docs/react/ssr.md`.

- The **Server Component** (`app/page.tsx`) loads data and passes it to the client as **`payload`** for `ViewModelBase`.
- **`enableStaticRendering`** (`mobx-react-lite`) and **`configure`** (`mobx`) run once in `src/app/bootstrap/client.ts` (imported from the client `Providers` shell).
- **`RootStore`** holds **`viewModels`** (`ViewModelStoreBase`); the instance is created in **`app/providers.tsx`** and passed as **`store`** into **`RootStoreProvider`**, which wires **`ViewModelsProvider`** + React context. **`withViewModel`** uses a stable **`id`** and **`fallback`**.
- After hydration, the button increments **`clientInteractions`** on the VM to verify MobX and `observer` in the browser.

This package is **standalone** (no `pnpm-workspace`): `mobx-view-model` is linked via **`file:../../dist`** (the built artifact). The repo root `node_modules` is not used by the example.

## Run

1. At the repo root: `pnpm install` and **`pnpm build`** (you need **`dist/`** — that is what `file:../../dist` points to).

2. In the example folder:

   ```bash
   cd examples/ssr-nextjs
   pnpm install
   pnpm dev
   ```

   If you change the library source: run `pnpm build` at the root again, then **`pnpm install`** in the example (so pnpm picks up the updated `dist`).

Or from the repo root (after the first `pnpm install` in `examples/ssr-nextjs`):

```bash
pnpm example:ssr
```

Open [http://localhost:3010](http://localhost:3010).

Production build of the example (from repo root; includes library `pnpm build`):

```bash
pnpm example:ssr:build
cd examples/ssr-nextjs && pnpm start
```

After you already ran `pnpm build` at the root (e.g. in CI), use **`pnpm example:ssr:build:example`** to install deps in the example and run `next build` only once for the library.

## Layout

| File | Role |
|------|------|
| `src/app/bootstrap/client.ts` | `configure`, `enableStaticRendering`, `viewModelsConfig` |
| `src/stores/root-store/index.ts` | `RootStore` class (`viewModels` + room for more stores) |
| `src/stores/root-store/context.ts` | `RootStoreContext` |
| `src/stores/root-store/utils/assert-defined.ts` | `assertDefined` via `yummies/type-guard` (`typeGuard.isDefined`) |
| `src/stores/root-store/hooks/use-root-store.ts` | `useRootStore` |
| `src/stores/root-store/components/provider.tsx` | `RootStoreProvider` (`store` prop) + `ViewModelsProvider` |
| `src/app/providers.tsx` | MobX init, `new RootStore()`, passes `store` to `RootStoreProvider` |
| `src/components/demo-page-client/model.ts` | `ViewModelBase` + `makeObservable` |
| `src/components/demo-page-client/index.tsx` | `withViewModel` + page client entry |
| `src/app/page.tsx` | Async RSC; data as `initialPayload` |

## Note

If **`dist/`** is missing, `pnpm install` in the example may fail or `file:../../dist` may be empty. After each library rebuild, run `pnpm install` again inside the example.
