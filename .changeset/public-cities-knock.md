---
"mobx-view-model-react": major
"mobx-view-model": major
"mobx-view-model-solid": patch
---

**Breaking:** `mobx-view-model` is now framework-agnostic. React bindings must
be imported from `mobx-view-model-react`; the `mobx-view-model/react` export
has been removed.

**Breaking:** replace the ViewModelStore attachment lifecycle APIs with
`define()`, `create()`, `connect()`, `unmount()`, and `generateId()`. Automatic
and global core view-model ID generation have been removed; store callers must
provide an ID, while framework integrations own any render-time ID generation
or custom `generateId()` behavior.

**Breaking:** ViewModel lifecycle and metadata APIs have changed. The
`ViewModel` interface now requires `vm` metadata, with lifecycle state available
as `vm.state` instead of `isUnmounting`. Resource data is available as
`vm.data`.
`ViewModelBase.vmConfig` and `ViewModelBase.isPayloadEqual` are no longer
exposed; configure payload comparison with `comparePayload`. Also replace
`ViewModelSimple.attachViewModelStore` with `init()`, and
`processViewComponent` with framework-agnostic `processRender`.

Improve view-model creation and lifecycle handling for React 18 and React 19
Strict Mode, Suspense, lazy-loaded components, and SSR.

### Removed

- `ViewModelStore.markToBeAttached()`
- `ViewModelStore.attach()` and `ViewModelStore.detach()`
- `ViewModelStore.isAbleToRenderView()`
- `ViewModelStore.createViewModel()`
- `ViewModelStore.processCreateConfig()`
- `ViewModelStore.generateViewModelId()`
- `ViewModelStoreBase.getOrCreateVmId()` and its attachment/mounting state
- `ViewModel.isUnmounting` and `ViewModel.payloadChanged` from the `ViewModel`
  interface; lifecycle state is available through the new `ViewModel.vm.state`.
- `ViewModelBase.vmConfig` and `ViewModelBase.isPayloadEqual`.
- `ViewModelParams.parentViewModelId`
- `ViewModelSimple.attachViewModelStore()`
- `ViewModelStore.mountedViewsCount`
- `GenerateViewModelIdFn` and `generateVmId`
- the `mobx-view-model/react` export and React dependencies from the core package
- configuration options `generateId`, `flushPendingReactions`, `useReactIds`,
  `suspendUntil`, `wrapViewsInObserver`, and `processViewComponent`
- the misspelled `isViewModeSimpleClass` export

### Changed

- `ViewModelStore.generateId()` now receives a required `id` and returns it by
  default; custom stores can override it for application-specific IDs.
- `ViewModelBase.setPayload()` now returns whether the payload was unchanged.
- `ViewModelBase.willMount()` may be asynchronous, and concurrent `mount()`
  calls are deduplicated.
- `ViewModelBase.unmount()` is synchronous; lifecycle state is exposed through
  `vm.state` instead of `isUnmounting`.
- View-model resource data is exposed through `vm.data`.
- Parent view models must be passed through `parentViewModel`; the store no
  longer resolves them from `parentViewModelId`.
- `ViewModelsConfig.processViewComponent` was renamed to `processRender` and
  now works with framework-agnostic render functions.
- `ViewModelsConfig` now requires `mode` and `getPayload`; `reactHook` also
  uses a framework-agnostic signature.
- Runtime detection of full and simple view models is now explicit and no
  longer depends on the presence of `payloadChanged`.

### Added

- `ViewModelStore.define()` to create, connect, register, and reuse a
  view-model instance by ID.
- `ViewModelStore.create()` for creating an instance without registering it.
- `ViewModelStore.connect()` for registering an existing instance after
  creation or render commit.
- `ViewModelStore.unmount()` for synchronous unmount and removal from the
  store.
- `ViewModelStore.resource` and `ViewModelResource` for request-scoped SSR
  resources.
- `ViewModelSimple.init()` as the initialization hook for simple view models.
- Required `ViewModel.vm` metadata containing lifecycle `state` and resource
  `data`.
- `ViewModelsConfig.processRender()` as the framework-agnostic render hook.
- More reliable `isViewModel()`, `isViewModelClass()`, `isViewModelSimple()`,
  and `isViewModelSimpleClass()` classification for custom view-model classes.
- React staging and cleanup for abandoned renders, Suspense retries, lazy
  components, Strict Mode, and SSR.
