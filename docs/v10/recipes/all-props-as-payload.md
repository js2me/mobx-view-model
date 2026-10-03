# Using all props as payload for your `ViewModel`

This recipe is helpful if you want to use all props as `payload` (`this.payload`) in your `ViewModel`.   

## Recommended: [`withPropsViewModel`](/react/api/with-props-view-model)

Use [`withPropsViewModel`](/react/api/with-props-view-model) — it is [`withViewModel`](/react/api/with-view-model) with `getPayload: (props) => props` and correct typings (no separate `payload` prop on the component).

What you will need:
- [`ViewModelBase`](/api/view-models/base-implementation) or custom implementation of [`ViewModel`](/api/view-models/interface) interface
- [`withPropsViewModel`](/react/api/with-props-view-model) HOC

```tsx
import { ViewModelBase } from 'mobx-view-model';
import { withPropsViewModel } from 'mobx-view-model-react';

interface ComponentProps {
  foo: number;
}

class YourVM extends ViewModelBase<ComponentProps> {}

export const YourComponent = withPropsViewModel(YourVM, ({ model }) => {
  return <div>{model.payload.foo}</div>;
});

<YourComponent foo={1} />
```

Configuration (`fallback`, `id`, `anchors`, etc.) is the same as for [`withViewModel`](/react/api/with-view-model#configuration), except there is no `getPayload` option.

## Alternative: manual `withViewModel` + cast

If you stay on [`withViewModel`](/react/api/with-view-model), pass props type into the first generic of `ViewModelBase`, set `getPayload: (props) => props`, and cast the output component type:

```tsx
import { ViewModelBase } from 'mobx-view-model';
import { withViewModel } from 'mobx-view-model-react';
import type { ComponentType } from 'react';

interface ComponentProps {
  foo: number;
}

class YourVM extends ViewModelBase<ComponentProps> {}

export const YourComponent = withViewModel(
  YourVM,
  ({ model }) => <div>{model.payload.foo}</div>,
  { getPayload: (props) => props },
) as unknown as ComponentType<ComponentProps>;

<YourComponent foo={1} />
```

Prefer [`withPropsViewModel`](/react/api/with-props-view-model) to avoid the cast.
