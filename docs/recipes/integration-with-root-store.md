# Integration with `RootStore`

This recipe may be helpful if you need access to your `RootStore` inside your `ViewModel` implementations.   

Follow the steps:   

1. Make your own `ViewModel` implementation that accepts `RootStore` as a `constructor` parameter   

```ts
// view-model.ts
// interface for your view model
import { ViewModel as ViewModelBase } from 'mobx-view-model';

export interface ViewModel<
  Payload extends AnyObject = EmptyObject,
  ParentViewModel extends ViewModel<any, any> | null = null,
> extends ViewModelBase<Payload, ParentViewModel> {}
```

```ts{6,16}
// view-model.impl.ts
// implementation for your interface
import { ViewModelBase, ViewModelParams } from 'mobx-view-model';

import { ViewModel } from './view-model';
import { RootStore } from "@/shared/store";

export class ViewModelImpl<
    Payload extends AnyObject = EmptyObject,
    ParentViewModel extends ViewModel<any, any> | null = null,
  >
  extends ViewModelBase<Payload, ParentViewModel>
  implements ViewModel<Payload, ParentViewModel>
{
  constructor(
    protected rootStore: RootStore,
    params: ViewModelParams<Payload, ParentViewModel>,
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


2. Make your own `ViewModelStore` implementation that accepts `RootStore` as a `constructor` parameter and overrides `create` to pass `rootStore`   

```ts{8,9,12,23,24,25}
// view-model.store.impl.ts
import {
  ViewModelStoreBase,
  ViewModel,
  ViewModelCreateConfig,
} from 'mobx-view-model';
import { ViewModelImpl } from "./view-model.impl.ts"
import { RootStore } from "@/shared/store";

export class ViewModelStoreImpl extends ViewModelStoreBase {
  constructor(protected rootStore: RootStore) {
    super();
  }

  create<VM extends ViewModel>(
    config: ViewModelCreateConfig<VM>,
  ): VM {
    const VM = config.VM;

    // here is you sending rootStore as
    // first argument into VM (your view model implementation)
    if (ViewModelImpl.isPrototypeOf(VM)) {
      return new VM(this.rootStore, config);
    }

    // otherwise it will be the default behavior
    // of this method
    return super.create(config);
  }
}
```

3. Add `ViewModelStore` into your `RootStore`   

```ts{8}
import { ViewModelStore } from 'mobx-view-model';
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
import { ViewModelProps, withViewModel } from 'mobx-view-model-react';
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
