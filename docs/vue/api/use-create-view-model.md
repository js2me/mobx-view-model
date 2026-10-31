# `useCreateViewModel`

Creates or reuses a model within Vue `setup()`, using the same arguments as `mobx-view-model-solid`:

```ts
useCreateViewModel(VM, payload?, config?, props?);
```

The payload can be a plain object or a getter. Vue `ref` and `computed` sources are supported as an additional convenience. The getter is tracked through Vue's reactivity system; changes call `setPayload` on the same model.

```ts
import { ref } from 'vue';
import { useCreateViewModel } from 'mobx-view-model-vue';

const userId = ref('1');
const model = useCreateViewModel(UserVM, () => ({ userId: userId.value }));
```

Call this inside `setup()`. A synchronous model is mounted before the composable returns. Asynchronous mounting starts immediately; wrappers show the fallback until it completes. Cleanup runs when the owner component unmounts. SSR awaits the mount promise in `ssr` mode.

## Configuration

```ts
interface UseCreateViewModelConfig<VM extends AnyViewModel> {
  id?: string | null;
  factory?: ViewModelsConfig<VM>['factory'];
  vmConfig?: ViewModelCreateConfig<VM>['vmConfig'];
  ctx?: ViewModelCreateConfig<VM>['ctx'];
  anchors?: ViewModelCreateConfig<VM>['anchors'];
  props?: ViewModelCreateConfig<VM>['props'];
}
```

The optional fourth argument supplies model props and overrides `config.props`, just as in Solid:

```ts
const model = useCreateViewModel(UserVM, () => ({ userId: props.userId }), {
  id: 'user-page',
  ctx: { source: 'route' },
}, props);
```

Models implementing `ViewModelSimple` accept the payload source and an optional creation config as well. Their `setPayload` receives the resolved payload object.

`useCreateViewModel` manages the model lifecycle; `observer(Component)` makes a manually connected Vue view react to MobX state. `withViewModel` and `withPropsViewModel` do both automatically.
