# `useCreateViewModel` hook  
A hook that connects [ViewModel](/api/view-models/overview) with React render tree, providing seamless MobX integration.  
Using in [`withViewModel()`](/react/api/with-view-model) HOC.  

## API Signature
```tsx
function useCreateViewModel<VM extends AnyViewModel>(
  ViewModelClass: Constructor<VM>,
  payload?: ViewModelPayload<VM>,
  config?: UseCreateViewModelConfig<VM>
): VM;
```

##  Usage  

### 1. Basic Usage (Default Configuration)  
```tsx
import { observer } from "mobx-react-lite";

export const YourComponent = observer(() => {
  const model = useCreateViewModel(YourVM);
})
```

### 2. Usage with payload
```tsx
import { observer } from "mobx-react-lite";

export const YourComponent = observer(() => {
  const model = useCreateViewModel(YourVM, { userId: '1' });
})
```

### 3. Custom Configuration
```tsx
import { observer } from "mobx-react-lite";

export const YourComponent = observer(() => {
  const model = useCreateViewModel(YourVM, {}, {
    config: {}, // vmConfig
    ctx: {}, // internal object as source for all cache inside this HOC
    factory: (config) => new config.VM(config), // factory method for creating VM instances
    generateId, // custom fn for generate id for this VM instances
    id, // unique id if you need to create 1 instance of your VM
  });
})
```


### Example:  

```tsx
import { ViewModelBase } from "mobx-view-model";
import { observer } from "mobx-react-lite";
import { observable, action } from "mobx";

class VM extends ViewModelBase {
  @observable
  accessor value = '';

  @action
  setValue = (value: string) => {
    this.value = value;
  }
}

export const YourComponent = observer(() => {
  const model = useCreateViewModel(VM)

  return (
    <div>
      <input value={model.value} onChange={e => model.setValue(e.target.value)} />
    </div>
  )
})
```
