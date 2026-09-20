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


2. Make a `ViewModelStore` that passes `RootStore` to classes derived from that base implementation.

```ts{8,9,12,23,24,25}
// view-model.store.impl.ts
import { ViewModelStoreBase, type AnyViewModel, type ViewModelCreateConfig } from 'mobx-view-model';
import { ViewModelImpl } from './view-model.impl';
import type { RootStore } from '@/shared/store';

export class ViewModelStoreImpl extends ViewModelStoreBase {
  constructor(protected rootStore: RootStore) {
    super();
  }

  create<VM extends AnyViewModel>(
    config: ViewModelCreateConfig<VM>,
  ): VM {
    const VM = config.VM;

    if (VM.prototype instanceof ViewModelImpl) {
      return new VM(this.rootStore, config);
    }

    return super.create(config);
  }
}
```

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

```tsx{2,4,10}
import { observable } from 'mobx';
import { observer } from 'mobx-react-lite';
import { type ViewModelProps, withViewModel } from 'mobx-view-model-react';
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

const MyPageView = observer(({ model }: ViewModelProps<MyPageVM>) => {
  return <div>{model.state}</div>;
});

export const MyPage = withViewModel(MyPageVM, MyPageView);
```
