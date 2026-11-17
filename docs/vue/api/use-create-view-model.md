# `useCreateViewModel`

Creates or reuses a model within Vue `setup()`, using the same arguments as `mobx-view-model-solid`:

```ts
useCreateViewModel(VM, payload?, config?, props?);
```

The payload argument is required when the full model has required payload fields; it is optional when all fields are optional. The payload can be a plain object or a getter. Vue `ref` and `computed` sources are supported as an additional convenience. The getter is tracked through Vue's reactivity system; changes call `setPayload` on the same model.

```ts
import { ref } from 'vue';
import { useCreateViewModel } from 'mobx-view-model-vue';

const userId = ref('1');
const model = useCreateViewModel(UserVM, () => ({ userId: userId.value }));
```

Call this inside `setup()`. A synchronous model is mounted before the composable returns. Asynchronous mounting starts immediately. For full models, `withViewModel` and `withPropsViewModel` show a fallback until it completes; `OnlyViewModel` hides its content. Simple models render immediately, including those with asynchronous `mount()`. This composable itself does not gate rendering. Cleanup runs when the owner component unmounts. SSR awaits the mount promise in `ssr` mode.

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

## Simple-model arguments

The full-model overload accepts `UseCreateViewModelConfig` and an optional fourth props argument. A simple model with `setPayload` accepts `useCreateViewModel(SimpleVM, payloadSource, creationConfig?)`, where the third argument is `ViewModelCreateConfig<SimpleVM>`. A model with no payload can use `useCreateViewModel(SimpleVM)`.

```ts
// Inside setup():
const simple = useCreateViewModel(SimpleVM, () => ({ count: count.value }), {
  VM: SimpleVM,
  id: 'simple-counter',
  payload: { count: count.value },
});
```
