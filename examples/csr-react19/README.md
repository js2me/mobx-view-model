# Example: CSR + React 19 + mobx-view-model

Простой клиентский пример без SSR:
- запуск через `esbuild` dev server;
- рендер через `ReactDOM.createRoot`;
- состояние хранится в ViewModel (`withViewModel` + `useViewModel`).

## Run

```bash
cd examples/csr-react19
pnpm install
pnpm dev
```

Open [http://localhost:3013](http://localhost:3013).
