# `withPropsViewModel`

Like `mobx-view-model-solid`, this is `withViewModel` with all component props used as the model payload. Pass payload fields directly rather than nesting them under `payload`.

```ts
import { ViewModelBase } from 'mobx-view-model';
import { withPropsViewModel } from 'mobx-view-model-vue';
import { h } from 'vue';

class UserVM extends ViewModelBase<{ userId: string }> {}

export const User = withPropsViewModel(UserVM, ({ model, userId }) =>
  h('div', model.payload.userId),
);
```

```vue
<template>
  <User :userId="userId" />
</template>
```

Every update creates a fresh shallow payload snapshot. The existing model instance remains connected to the store. Simple models implementing `setPayload` work too.

The optional third argument accepts the same configuration as `withViewModel`, except `getPayload`. The resulting component supports `.connect(anchor)` and typed `useViewModel(User)` lookup.
