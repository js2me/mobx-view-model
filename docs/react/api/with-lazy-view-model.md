# `withLazyViewModel` HOC  

Optional for usage HOC that doing the same thing as [`withViewModel`](/react/api/with-view-model), but fetching `ViewModel` and `View` "lazy"  

::: tip
This HOC is using [react-simple-loadable](https://www.npmjs.com/package/react-simple-loadable) package  
:::

## API Signature
```tsx
function withLazyViewModel<VM extends AnyViewModel>(
  loadFn: () => Promise<{
    Model: Constructor<VM>,
    Component: ComponentType<ComponentProps & ViewModelProps<VM>>
  }>,
  config?: ViewModelHocConfig<VM>
): ComponentWithLazyViewModel
```


## Usage  

Let's create a [ViewModel](/api/view-models/overview) with a lot blocks of code  

```ts title="model.ts"
import { ViewModelBase } from "mobx-view-model";

export class FruitButtonHugeVM extends ViewMOdelBase {
  ... // large of code lines

  handleButtonClick = () => {
    //...
  }
}
```

Create a `View` component  

```tsx title="view.tsx"
import { ViewModelProps } from "mobx-view-model";
import { observer } from "mobx-react-lite";
import { FruitButtonHugeVM } from "./model";

export const FruitButtonView = observer(({ model }: ViewModelProps<FruitButtonHugeVM>) => {
  return (
    <div>
      <button onClick={model.handleButtonClick}>click me</button>
    </div>
  )
})
```

And connect them together with lazy loading this modules using this HOC   

```tsx title="index.ts"
import { withLazyViewModel } from "mobx-view-model";

export const FruitButton = withLazyViewModel(
  async () => {
    const [{ FruitButtonHugeVM }, { FruitButtonView }] = await Promise.all([
      import("./model"),
      import("./view"),
    ])
    
    return {
      Model: FruitButtonHugeVM,
      View: FruitButtonView,
    }
  },
)
```
