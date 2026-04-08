# `useCreateViewModel`

Composable that creates (or reuses from the store) a [ViewModel](/api/view-models/overview) tied to the current Vue instance lifecycle. Used inside [`withViewModel()`](/vue/api/with-view-model).

`payload` may be a plain value, `ref`, or `computed`; changes update the model via `setPayload`.

## API signature

```ts
function useCreateViewModel<TViewModel extends AnyViewModel>(
  VM: Class<TViewModel>,
  payload?: MaybeRef<TViewModel['payload']>,
  config?: UseCreateViewModelConfig<TViewModel>,
): TViewModel;
```

For `ViewModelSimple`, overloads require or omit the `payload` argument depending on whether the simple view model’s payload type is partial; see the published `.d.ts` for exact signatures.

## `UseCreateViewModelConfig`

```ts
interface UseCreateViewModelConfig<TViewModel extends AnyViewModel> {
  id?: Maybe<string>;
  generateId?: (ctx: AnyObject) => string;
  factory?: (config: any) => TViewModel;
  vmConfig?: ViewModelsRawConfig;
  ctx?: AnyObject;
  component?: unknown;
  anchors?: unknown[];
  props?: AnyObject;
}
```

## Usage

### Basic

```ts
import { useCreateViewModel } from 'mobx-view-model/vue';

const model = useCreateViewModel(YourVM);
```

### With payload

```ts
const model = useCreateViewModel(YourVM, { userId: '1' });
```

### Reactive payload (`ref` / `computed`)

```ts
const userId = ref('1');
const model = useCreateViewModel(YourVM, () => ({ userId: userId.value }));
// or pass a computed ref depending on your payload shape
```

### Custom configuration

```ts
const model = useCreateViewModel(YourVM, {}, {
  vmConfig: {},
  ctx: {},
  factory: (config) => new config.VM(config),
  generateId,
  id: 'singleton-vm',
  anchors: [],
});
```

### Example

```ts
import { ViewModelBase } from 'mobx-view-model';
import { observer, useCreateViewModel } from 'mobx-view-model/vue';
import { defineComponent, h } from 'vue';
import { action, observable } from 'mobx';

class VM extends ViewModelBase {
  @observable accessor value = '';

  @action
  setValue = (value: string) => {
    this.value = value;
  };
}

export default observer(
  defineComponent({
    setup() {
      const model = useCreateViewModel(VM);
      return () =>
        h('input', {
          value: model.value,
          onInput: (e: Event) =>
            model.setValue((e.target as HTMLInputElement).value),
        });
    },
  }),
);
```
