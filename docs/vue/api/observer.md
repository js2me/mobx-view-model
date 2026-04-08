# `observer`

Wraps a Vue 3 component so that **MobX** tracking re-runs the render (or the `setup` render function) when observed values change. Implemented with a MobX `Reaction` and `forceUpdate`.

## API signature

```ts
function observer<T extends Component>(component: T): T;
```

## Usage

```ts
import { observer } from 'mobx-view-model/vue';
import { defineComponent } from 'vue';

export default observer(
  defineComponent({
    name: 'Counter',
    setup() {
      return () => h('div', store.count);
    },
  }),
);
```

- If the component uses **`setup` returning a function**, that function is tracked.
- If the component uses the **`render` option**, `render` is tracked.

`withViewModel` applies `observer` to the inner view when [`wrapViewsInObserver`](/api/view-models/view-models-config#wrapviewsinobserver) is enabled.
