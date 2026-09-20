---
"mobx-view-model-react": major
"mobx-view-model": major
---

**Breaking:** `mobx-view-model` is now framework-agnostic. React bindings must
be imported from `mobx-view-model-react`; the `mobx-view-model/react` export
has been removed.

**Breaking:** replace the ViewModelStore attachment lifecycle APIs with
`define()`, `create()`, `connect()`, `unmount()`, and `generateId()`. Automatic
and global view-model ID generation have been removed, so integrations must
provide an ID or override `generateId()`.

**Breaking:** ViewModel lifecycle and configuration APIs have been simplified:
use `lifecycleState` and `setPayload()` instead of `isUnmounting` and
`payloadChanged`; replace `ViewModelSimple.attachViewModelStore` with `init()`;
and replace `processViewComponent` with framework-agnostic `processRender`.

Improve view-model creation and lifecycle handling for React 18 and React 19
Strict Mode, Suspense, lazy-loaded components, and SSR.
