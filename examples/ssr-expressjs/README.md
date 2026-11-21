# Example: Express + SSR + mobx-view-model

Аналог `examples/ssr-nextjs`, но без `next`:
- SSR делает `express` + `react-dom/server`.
- Гидрация на клиенте через `hydrateRoot`.
- Тот же сценарий с `RootStore`, `withRootStoreProps`, `withViewModel`.

## Run

```bash
cd examples/ssr-expressjs
pnpm install
pnpm dev
```

Open [http://localhost:3011](http://localhost:3011).

## Browser regression tests

Run these commands from the repository root after installing the workspace dependencies.

```bash
pnpm --filter mobx-view-model-example-ssr-expressjs exec playwright install chromium
pnpm test:react-browser
```

The tests build the workspace bindings, start a local SSR fixture, and exercise hydration, cart persistence and browser history in Chromium.
