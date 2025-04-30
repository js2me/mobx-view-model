# `<OnlyViewModel />` Component  

Component which creates the instance of passed `ViewModel` class and renders nothing or passed `children`.  


## Example   

```tsx
import { ViewModelBase, OnlyViewModel } from "mobx-view-model";

class TestVM extends ViewModelBase {
  foo = 100;
}

<OnlyViewModel model={TestVM} /> 
```

