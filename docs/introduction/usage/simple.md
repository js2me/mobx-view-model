# Simple usage  

The simplest way to make integration with this library is to use [`ViewModelSimple` interface](/api/view-models/view-model-simple)  

Follow the steps:  

##### 1. Create class or implement [`ViewModelSimple` interface](/api/view-models/view-model-simple)  

```tsx
import { ViewModelSimple } from 'mobx-view-model';
import { makeAutoObservable } from 'mobx';

// export class MyPageVM implements ViewModelSimple {
export class MyPageVM {
  state = '';

  constructor() {
    makeAutoObservable(this);
  }

  setState = (state: string) => {
    this.state = state
  }
}
```

##### 2. Create instance of your `ViewModel` using [`withViewModel()` HOC](/react/api/with-view-model)   

```tsx
import { observer } from 'mobx-react-lite';
import { ViewModelPayload, useCreateViewModel } from 'mobx-view-model';

const MyPage = withViewModel(MyPageVM, ({ model }) => {
  return <div>{model.state}</div>;
});
```

##### 3. Use it  

```tsx
<MyPage />
```


If you need access more lifecycle methods or full [ViewModel interface](/api/view-models/interface)   
This guide you can found [on the next page](/introduction/usage/with-base-implementation)  

