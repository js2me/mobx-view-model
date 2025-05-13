# Simple usage  

The most simplest way to make integration with this library is to use [`ViewModelSimple` interface](/api/view-models/view-model-simple)  

Steps:  

1. Implement [`ViewModelSimple` interface](/api/view-models/view-model-simple)  

```tsx
import { ViewModelSimple } from 'mobx-view-model';
import { makeAutoObservable } from 'mobx';

export class MyPageVM implements ViewModelSimple {
  state = '';

  constructor() {
    makeAutoObservable(this);
  }

  setState = (state: string) => {
    this.state = state
  }
}
```

2. Create instance of your ViewModel using [`useCreateViewModel()` hook](/react/api/use-create-view-model)  

```tsx
import { observer } from 'mobx-react-lite';
import { ViewModelPayload, useCreateViewModel } from 'mobx-view-model';

const MyPageView = observer(() => {
  const model = useCreateViewModel(MyPageVM);

  return <div>{model.state}</div>;
});
```

3. Use it  

```tsx
<MyPage />
```


If you need access more lifecycle methods or full [ViewModel interface](/api/view-models/interface)   
This guide you can found [on the next page](/introduction/usage/with-base-implementation)  

