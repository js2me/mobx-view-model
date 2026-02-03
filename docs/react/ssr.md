---
id: ssr
title: Server Side Rendering
sidebar_label: SSR
sidebar_position: 2
slug: /react/ssr
---

# Server-Side Rendering  

SSR is supported with **ViewModelStore** and predictable hydration on the client.  
The main requirement is to keep the initial render **identical** on server and client.  

#### Next.js  
`mobx-view-model` works in Next.js **only with `"use client"`**.  
`"use server"` does not work because Next.js forbids React hooks in server components.  

## Basic SSR with `withViewModel()`  
Use a shared `ViewModelStore` and pass the same payload on server and client.  
This guarantees identical HTML for hydration.  

```tsx
import { ViewModelBase, ViewModelsProvider, ViewModelStoreBase, withViewModel } from "mobx-view-model";

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

## Hydration with preloaded data  
If you preload data on the server, pass the same payload to the client.  

```tsx
import { ViewModelStoreBase, ViewModelsProvider } from "mobx-view-model";
import { hydrateRoot } from "react-dom/client";

const vmStore = new ViewModelStoreBase();

hydrateRoot(
  document.getElementById("app")!,
  <ViewModelsProvider value={vmStore}>
    <Page payload={{ count: 1 }} />
  </ViewModelsProvider>,
);
```

## Async `mount()`  
If your `mount()` is async, the initial render will show **fallback** both on server and client.  
This prevents hydration mismatches.  

```tsx
class PageVM extends ViewModelBase {
  async mount() {
    await sleep(100);
    super.mount();
  }
}
```

:::: tip Keep SSR and CSR identical  
Use the same `payload` and `ViewModelStore` setup on server and client.  
Do not rely on side effects inside `mount()` for the first render.  
::::