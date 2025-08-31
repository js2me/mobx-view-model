# Wrap in `observer()` all view components   

If you need to automatically wrap in [`observer()` MobX HOC](https://mobx.js.org/api.html#observer) view components for your ViewModel charged components you can achieve this using:

**1.** [`wrapViewsInObserver`](/api/view-models/view-models-config.html#wrapviewsinobserver) view model config option  

Example:    

```tsx
import { viewModelsConfig } from "mobx-view-model";

viewModelsConfig.wrapViewsInObserver = true;
```


**2.** [`processViewComponent`](/api/view-models/view-models-config.html#processviewcomponent) view model config option  

Example:   

```tsx
import { viewModelsConfig } from "mobx-view-model";

viewModelsConfig.processViewComponent = (component) => {
  if ((component as any).$$typeof !== Symbol.for('react.memo')) {
    return;
  }
  // @ts-ignore
  return component && observer(component);
};
```