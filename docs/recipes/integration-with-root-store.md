# Integration with `RootStore`

This recipe may be helpful if you need access to your `RootStore` inside your `ViewModel` implementations.   

Follow the steps:   

1. Make a base `ViewModel` implementation that accepts `RootStore` as a constructor parameter.

```ts
// view-model.impl.ts
import { ViewModelBase, type ViewModelParams } from 'mobx-view-model';

import type { RootStore } from '@/shared/store';

export class ViewModelImpl extends ViewModelBase {
  constructor(
    protected rootStore: RootStore,
    params: ViewModelParams,
  ) {
    super(params);
  }

  // example of your custom methods
  // and properties
  get queryParams() {
    return this.rootStore.router.queryParams.data;
  }
}

```


2. Configure a `ViewModelStore` factory that passes `RootStore` to classes derived from that base implementation. Using the factory instead of overriding `create` preserves the store's `vmConfig` merging and per-creation `factory` overrides.

```ts{13}
// view-model.store.impl.ts
import { ViewModelStoreBase, viewModelsConfig } from 'mobx-view-model';
import { ViewModelImpl } from './view-model.impl';
import type { RootStore } from '@/shared/store';

export class ViewModelStoreImpl extends ViewModelStoreBase {
  constructor(protected rootStore: RootStore) {
    super({
      vmConfig: {
        factory: (params) => {
          const VM = params.VM;
          if (VM === ViewModelImpl || VM.prototype instanceof ViewModelImpl) {
            return new VM(rootStore, params);
          }
          return viewModelsConfig.factory(params);
        },
      },
    });
  }
}
```

An explicit `factory` in a creation config takes precedence; a per-view-model `vmConfig.factory` can also override this store default.

3. Add `ViewModelStore` into your `RootStore`   

```ts{8}
import type { ViewModelStore } from 'mobx-view-model';
import { ViewModelStoreImpl } from '@/shared/lib/mobx';

export class RootStoreImpl implements RootStore {
  viewModels: ViewModelStore;

  constructor() {
    this.viewModels = new ViewModelStoreImpl(this);
  }
}
```  

4. Create a `View` with a `ViewModel`   

```tsx
import { observable } from 'mobx';
import { withViewModel } from 'mobx-view-model-react';
import { ViewModelImpl } from '@/shared/lib/mobx';

export class MyPageVM extends ViewModelImpl {
  @observable
  accessor state = '';

  protected async willMount() {
    await this.rootStore.beerApi.takeBeer();
  }

  protected didMount() {
    console.info('did mount');
  }
}

export const MyPage = withViewModel(MyPageVM, ({ model }) => {
  return <div>{model.state}</div>;
});
```

:::: warning View must not be wrapped
`withViewModel` wraps the View in `observer` itself. Pass a plain render function; wrapping it in `observer` or `React.memo` first causes [Error #4](/errors/4).
::::
