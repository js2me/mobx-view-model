# With base implementation

Another simplest usage is to work with [base implementation](/api/view-models/base-implementation) of the [`ViewModel` interface](/api/view-models/interface)  

Follow the steps:  

##### **1.** Create your [`ViewModel`](/api/view-models/overview) class using [`ViewModelBase`](/api/view-models/base-implementation) (base implementation of [`ViewModel` package interface](/api/view-models/interface))   

```tsx
import {
  ViewModelProps,
  ViewModelBase,
  withViewModel
} from 'mobx-view-model';

export class MyPageVM extends ViewModelBase<{ payloadA: string }> {
  @observable
  accessor state = '';

  mount() {
    super.mount();
  }

  protected didMount() {
    console.info('did mount');
  }

  unmount() {
    super.unmount();
  }
}
```

##### **2.** Create view component using [HOC `withViewModel()`](/react/api/with-view-model)  

```tsx
import { observer } from 'mobx-react-lite';
import { withViewModel } from 'mobx-view-model';

export const MyPage = withViewModel(MyPageVM, ({ model }) => {
  return <div>{model.state}</div>;
});
```

or you can use [`useCreateViewModel()` hook](/react/api/use-create-view-model)  

```tsx
import { observer } from 'mobx-react-lite';
import { ViewModelPayload, useCreateViewModel } from 'mobx-view-model';

export const MyPage = observer(
  ({ payload }: { payload: ViewModelPayload<MyPageVM> }) => {
    const model = useCreateViewModel(MyPageVM, payload);

    return <div>{model.state}</div>;
  },
);
```  
::: tip don't forget to use the [`observer()` hoc](https://mobx.js.org/react-integration.html#react-integration)   
:::

##### **3.** Use it  

```tsx
<MyPage payload={{ payloadA: '1' }} />
```


If you need access to all other view models then you need to add [ViewModelStore](/api/view-model-store/overview).  
This guide you can found [on the next page](/introduction/usage/with-view-model-store)  

