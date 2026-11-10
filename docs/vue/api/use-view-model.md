# `useViewModel`

Returns an already created model. Call it inside Vue `setup()` or `<script setup>`. To create a model, use `useCreateViewModel`, `withViewModel`, or `withPropsViewModel`.

## Active model

The nearest `withViewModel` / `withPropsViewModel` wrapper or `ActiveViewModelProvider` provides the active model.

```ts
import { defineComponent, h } from 'vue';
import { ViewModelBase } from 'mobx-view-model';
import { useViewModel } from 'mobx-view-model-vue';

class PageVM extends ViewModelBase {}

export const Child = defineComponent({
  setup() {
    const model = useViewModel<PageVM>();
    return () => h('span', model.id);
  },
});
```

## Lookup by ID or class

Provide a store using `ViewModelsProvider`. Strings are IDs; class lookups use the constructor.

```ts
import { defineComponent, h } from 'vue';
import { ViewModelBase } from 'mobx-view-model';
import { useViewModel } from 'mobx-view-model-vue';

class PageVM extends ViewModelBase {}

export const Child = defineComponent({
  setup() {
    const byId = useViewModel<PageVM>('page-id');
    const byClass = useViewModel(PageVM);
    return () => h('span', `${byId.id}:${byClass.id}`);
  },
});
```

## Lookup by connected component or anchor

```ts
import { defineComponent, h } from 'vue';
import { ViewModelBase } from 'mobx-view-model';
import { useViewModel, withViewModel } from 'mobx-view-model-vue';

class PageVM extends ViewModelBase {}
const Anchor = defineComponent({ render: () => null });

const Child = defineComponent({
  setup() {
    const byAnchor = useViewModel<PageVM>(Anchor);
    const byComponent = useViewModel(Page);
    return () => h('span', `${byAnchor.id}:${byComponent.id}`);
  },
});

export const Page = withViewModel(PageVM, () => h(Child), {
  id: 'page-id',
  anchors: [Anchor],
});
```

Render `Page` under `ViewModelsProvider`. `.connect(Anchor)` can also register an anchor. The connected component lookup infers its model type.
