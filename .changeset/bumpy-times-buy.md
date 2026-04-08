---
"mobx-view-model": minor
---

Deprecate re-exports of all React integration APIs from the `mobx-view-model` root entry. They remain available there for backward compatibility but will be removed in a future major version.

Use the **`mobx-view-model/react`** subpath instead. It is the dedicated export for:

- **`withViewModel`** HOC and related types (`ViewModelProps`, `VMComponent`, `VMComponentProps`, `ViewModelHocConfig`, `ViewModelSimpleHocConfig`, `WithViewModelReactHook`, etc.)
- Hooks **`useCreateViewModel`** (with **`UseCreateViewModelConfig`**) and **`useViewModel`**
- Providers and components **`ViewModelsProvider`**, **`OnlyViewModel`**, **`ActiveViewModelProvider`**
- Contexts **`ViewModelsContext`** and **`ActiveViewModelContext`** (low-level; prefer `withViewModel` / `ViewModelsProvider` in app code)

Core non-React APIs (`ViewModelBase`, `ViewModelStoreBase`, `viewModelsConfig`, types for view models and stores, etc.) stay on **`mobx-view-model`**.
