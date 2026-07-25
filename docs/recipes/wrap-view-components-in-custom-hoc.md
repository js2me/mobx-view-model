# Wrap view components in custom HOC

To achieve this you can use the [`processRender`](/api/view-models/view-models-config.html#processrender) view model config option.

[`withViewModel`](/react/api/with-view-model) applies `observer` **after** `processRender`. If your HOC only renders `<Component />` as a child, reads from `model` inside that child are outside the outer `observer` tracking scope — wrap the inner component with `observer` first.

Example:

```tsx
import { viewModelsConfig } from "mobx-view-model";
import { observer } from "mobx-react-lite";

const YourHOC = (Component) => {
  return (props) => {
    return (
      <ErrorBoundary>
        <Component {...props} />
      </ErrorBoundary>
    )
  }
}

viewModelsConfig.processRender = (Component) => {
  return YourHOC(observer(Component));
};
```
