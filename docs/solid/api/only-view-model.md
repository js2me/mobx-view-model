# `<OnlyViewModel />` Component

Creates an instance of a passed [`ViewModel`](/api/view-models/interface) class and renders nothing until `isMounted`, then renders `children`.

If `children` is a function, it receives the created model.  
`ViewModelSimple` is not supported here.

## Example

```tsx
import { ViewModelBase } from "mobx-view-model";
import { OnlyViewModel } from "mobx-view-model-solid";

class TestVM extends ViewModelBase {
  foo = 100;
}

<OnlyViewModel model={TestVM} />

<OnlyViewModel model={TestVM}>
  {(model) => <span>{model.foo}</span>}
</OnlyViewModel>
```
