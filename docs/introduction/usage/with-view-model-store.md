# Usage with View Model Store

`ViewModelStore` registers view model instances and lets them look up one another. Add it when components need to find registered instances by class, component, or ID.

## 1. Create a store

```tsx title="/src/shared/lib/mobx/view-model-store.ts"
import { ViewModelStoreBase } from "mobx-view-model";

export class MyViewModelStore extends ViewModelStoreBase {}
```

## 2. Create a store when bootstrapping the application

In the browser, create the store once when the app starts. Each SSR request must have its own store: a shared store can expose one request's view models to another.

## <ReactMark /> 3. Provide the store to React

Pass the store created for the current application instance to the provider. `App` does not need separate CSR and SSR implementations.

```tsx
import { ViewModelsProvider } from 'mobx-view-model-react';
import type { MyViewModelStore } from '@/shared/lib/mobx/view-model-store';

export function App({ viewModelStore }: { viewModelStore: MyViewModelStore }) {
  return (
    <ViewModelsProvider value={viewModelStore}>
      {/* application */}
    </ViewModelsProvider>
  );
}
```

On the client, create the store once when starting the application:

```tsx
import { createRoot } from 'react-dom/client';
import { App } from '@/app';
import { MyViewModelStore } from '@/shared/lib/mobx/view-model-store';

const viewModelStore = new MyViewModelStore();
createRoot(document.getElementById('app')!).render(
  <App viewModelStore={viewModelStore} />,
);
```

For SSR, create the store inside the request handler, not at module scope:

```tsx
import { renderToString } from 'react-dom/server';
import { App } from '@/app';
import { MyViewModelStore } from '@/shared/lib/mobx/view-model-store';

export function renderRequest() {
  const viewModelStore = new MyViewModelStore();
  return renderToString(<App viewModelStore={viewModelStore} />);
}
```

When hydrating server-rendered HTML, use `hydrateRoot` instead of `createRoot`. Keep initial data consistent between server and client; see the [SSR guide](/react/ssr#minimal-pattern-any-ssr-stack).

## 4. Access other registered ViewModels

The components that create these view models must be rendered under the same provider. The store's `get()` returns `null` until an instance is registered; React's `useViewModel()` throws if it cannot find the requested instance.

```ts
import { ViewModelBase } from "mobx-view-model";
import { ParentVM } from "../parent-vm";
import { ChildVM } from "../child-vm";
import { AppLayoutVM } from "@/app-layout";

export class YourVM extends ViewModelBase {
  get parentData() {
    return this.viewModels.get(ParentVM)?.data;
  }

  get childData() {
    return this.viewModels.get(ChildVM)?.data;
  }

  get appLayoutData() {
    return this.viewModels.get(AppLayoutVM)?.data;
  }
}
```
