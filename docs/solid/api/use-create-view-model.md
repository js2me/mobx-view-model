# `useCreateViewModel` hook

Creates a [ViewModel](/api/view-models/overview) (or `ViewModelSimple`) and ties its lifecycle to the Solid component (setup once, `onCleanup` for unmount).

Used inside [`withViewModel()`](/solid/api/with-view-model).

## API Signature

```tsx
function useCreateViewModel<VM extends AnyViewModel>(
  ViewModelClass: Class<VM>,
  payload?: VM["payload"] | (() => VM["payload"]),
  config?: UseCreateViewModelConfig<VM>,
): VM;
```

Payload may be a plain value or a Solid-friendly accessor `() => payload` (recommended when payload comes from reactive props).

## Usage

### 1. Basic

```tsx
import { useCreateViewModel } from "mobx-view-model-solid";

export const YourComponent = () => {
  const model = useCreateViewModel(YourVM);
  return <div>{model.id}</div>;
};
```

### 2. With payload

```tsx
export const YourComponent = (props: { userId: string }) => {
  const model = useCreateViewModel(YourVM, () => ({ userId: props.userId }));
  return <div>{model.payload.userId}</div>;
};
```

### 3. Custom configuration

```tsx
const model = useCreateViewModel(YourVM, {}, {
  vmConfig: {},
  ctx: {},
  factory: (config) => new config.VM(config),
  id: "fixed-id",
  anchors: [],
});
```

### Full example

```tsx
import { ViewModelBase } from "mobx-view-model";
import { useCreateViewModel } from "mobx-view-model-solid";
import { observable, action } from "mobx";

class VM extends ViewModelBase {
  @observable
  accessor value = "";

  @action
  setValue = (value: string) => {
    this.value = value;
  };
}

export const YourComponent = () => {
  const model = useCreateViewModel(VM);

  return (
    <div>
      <input
        value={model.value}
        onInput={(e) => model.setValue(e.currentTarget.value)}
      />
    </div>
  );
};
```

## Notes

- Ids use Solid [`createUniqueId()`](https://docs.solidjs.com/reference/component-apis/create-unique-id) when `config.id` is omitted (stable across SSR hydration).
- In `viewModelsConfig.mode === 'ssr'`, a thenable from `mount()` is thrown on the server so Solid `<Suspense>` can wait.
- The hook calls `enableObservableTracking()` as a safety net.
