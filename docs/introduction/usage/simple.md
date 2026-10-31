# Simple usage  

The simplest way to integrate with this library is a lightweight MobX class compatible with [`ViewModelSimple`](/api/view-models/view-model-simple). Implementing the interface is optional because all of its members are optional.

Follow the steps:  

## 1. Create a ViewModel class

```tsx
import { makeAutoObservable } from 'mobx';

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

## 2. Connect it to a React view

```tsx
import { withViewModel } from 'mobx-view-model-react';

const MyPage = withViewModel(MyPageVM, ({ model }) => {
  return <div>{model.state}</div>;
});
```

## 3. Render it

```tsx
<MyPage />
```


If you need access to more lifecycle methods or the full [ViewModel interface](/api/view-models/interface),  
you can find that guide [on the next page](/introduction/usage/with-base-implementation).  
