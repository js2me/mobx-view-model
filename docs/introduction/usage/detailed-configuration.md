# Detailed configuration

This way can be helpful when: 
 - if you need to override default factory method of creating view model instances in [ViewModelStore](/api/view-model-store/interface).  
 - if you need to inject root store into [ViewModelStore](/api/view-model-store/interface).  
 - if you need more control of the mounting/unmounting [ViewModels](/api/view-models/overview).  


Follow the steps:   

##### 1. Make your own `ViewModel` implementation and interface with some customizations:  

```ts{9,10}
// view-model.ts
// interface for your view model
import { ViewModel as ViewModelBase } from 'mobx-view-model';

export interface ViewModel<
  Payload extends AnyObject = EmptyObject,
  ParentViewModel extends ViewModel<any, any> | null = null,
> extends ViewModelBase<Payload, ParentViewModel> {
  trackName: string;
  getTrackTime(): Date;
}
```

```ts{5,12,14,16,17,18}
// view-model.impl.ts
// implementation for your interface
import { ViewModelBase, ViewModelParams } from 'mobx-view-model';

import { ViewModel } from './view-model';

export class ViewModelImpl<
    Payload extends AnyObject = EmptyObject,
    ParentViewModel extends ViewModel<any, any> | null = null,
  >
  extends ViewModelBase<Payload, ParentViewModel>
  implements ViewModel<Payload, ParentViewModel>
{
  trackName = new Date().toISOString()

  getTrackTime() {
    return new Date();
  }
}

```


##### 2. Make your own `ViewModelStore` implementation   

```ts{8,19,20,21}
// view-model.store.impl.ts
import {
  ViewModelParams,
  ViewModelStoreBase,
  ViewModel,
  ViewModelCreateConfig,
} from 'mobx-view-model';
import { ViewModelImpl } from "./view-model.impl.ts"

export class ViewModelStoreImpl extends ViewModelStoreBase {
  createViewModel<VM extends ViewModel<any, ViewModel<any, any>>>(
    config: ViewModelCreateConfig<VM>,
  ): VM {
    const VM = config.VM;

    // here is you sending rootStore as
    // first argument into VM (your view model implementation)
    if (ViewModelImpl.isPrototypeOf(VM)) {
      const instance = super.createViewModel(config) as unknown as ViewModelImpl;
      console.log(instance.getTrackTime());
      return instance;
    }

    // otherwise it will be default behaviour
    // of this method
    return super.createViewModel(config);
  }
}
```

##### 3. Create `View` with `ViewModel`   

```tsx{2,4,10}
import { ViewModelProps, withViewModel } from 'mobx-view-model';
import { ViewModelImpl } from '@/shared/lib/mobx';

export class MyPageVM extends ViewModelImpl {
  @observable
  accessor state = '';

  async mount() {
    // this.isMounted = false;
    console.log(this.trackName)
    super.mount(); // this.isMounted = true
  }

  didMount() {
    console.info('did mount');
  }

  unmount() {
    super.unmount();
  }
}

export const MyPage = withViewModel(MyPageVM, ({ model }) => {
  return <div>{model.state}</div>;
});
```

Also you may be helpful to read [**this recipe about integration with `RootStore`**](/recipes/integration-with-root-store)   