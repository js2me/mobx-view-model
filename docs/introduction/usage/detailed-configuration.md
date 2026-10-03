# Detailed configuration

Use configuration when the defaults do not match a view's payload or lifecycle requirements. Most applications only need the default setup from the previous guides.

## Configure one view

Pass `vmConfig` to `withViewModel` to change configuration for one view model. This leaves the global defaults unchanged.

```tsx
import { withViewModel } from 'mobx-view-model-react';

export const MyPage = withViewModel(MyPageVM, MyPageView, {
  vmConfig: {
    comparePayload: 'shallow',
    payloadObservable: 'ref',
  },
});
```

See the [`ViewModelsConfig` reference](/api/view-models/view-models-config) for every option and its default.

## Configure a store

Pass `vmConfig` to `ViewModelStoreBase` when the same settings should apply to every view model created by that store.

```ts
import { ViewModelStoreBase } from 'mobx-view-model';

const viewModelStore = new ViewModelStoreBase({
  vmConfig: {
    comparePayload: false,
    payloadComputed: 'struct',
    payloadObservable: 'ref',
  },
});
```

## Customize instance creation

Use a `factory` when a view model needs dependencies in addition to its standard configuration. A factory must preserve the construction contract of the ViewModel classes it handles: `ViewModelSimple` classes are constructed without arguments, while `ViewModelBase` classes receive their creation configuration. For an application-wide dependency such as a root store, follow the [RootStore integration recipe](/recipes/integration-with-root-store), which shows a custom store implementation.

Set global configuration before creating stores or view models. Global settings act as defaults; a store or HOC can override them with `vmConfig`.
