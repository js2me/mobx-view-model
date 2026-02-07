# Simple usage  

The simplest way to integrate with this library is to use the [`ViewModelSimple` interface](/api/view-models/view-model-simple).  

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

##### 2. Create an instance of your `ViewModel` using [`withViewModel()` HOC](/react/api/with-view-model)   

```tsx
import { withViewModel } from 'mobx-view-model';

const MyPage = withViewModel(MyPageVM, ({ model }) => {
  return <div>{model.state}</div>;
});
```

##### 3. Use it  

```tsx
<MyPage />
```


If you need access to more lifecycle methods or the full [ViewModel interface](/api/view-models/interface),  
you can find that guide [on the next page](/introduction/usage/with-base-implementation).  

