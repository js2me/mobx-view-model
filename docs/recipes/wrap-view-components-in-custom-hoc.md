# Wrap view components in custom HOC

To achieve this you can use the [`processRender`](/api/view-models/view-models-config.html#processrender) view model config option.   

Example:   

```tsx
import { viewModelsConfig } from "mobx-view-model";

const YourHOC = (Component) => {
  return (props) => {
    return (
      <ErrorBoundary>
        <Component {...props} />
      </ErrorBoundary>
    )
  }
}

viewModelsConfig.processRender = (component) => {
  return YourHOC(component);
};
```
