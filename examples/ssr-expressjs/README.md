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
