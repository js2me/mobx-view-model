# Devtools architecture

`ViewModelDevtools` is the public composition root. It creates the application models, connects the host store, and mounts the React adapter. Internal components bind to the model that owns their state rather than adding more responsibilities to this facade.

| Component | Responsibility |
| --- | --- |
| `model/devtools-settings.ts` | Display preferences, theme resolution, local storage |
| `model/devtools-inspector.ts` | Connected data, root items, expansion, cached item models, mounted scroll port |
| `model/search/` | Query state and keyboard interaction, path matching, suggestions, filtered items |
| `model/list-item/` | Inspectable tree nodes, shared expansion traversal, property history |
| `model/editing/` | Editor state, mutation targets, propagation into the host's MobX runtime |
| `model/inspection/` | Safe reads, collection adapters, value types and previews |
| `model/devtools-window.ts` and `model/window/` | Popup state, retained layout, geometry and mouse gestures |
| `model/connection/` | Store observation for core 8–11; standalone discovery for 8.10.1 and 9–11; core 8.0.0 uses explicit `connect` |
| `ui/` | Views, their ViewModels, DOM measurement, scrollbars and the React renderer |

Views choose and render React components. ViewModels expose state and commands; the content ViewModel exposes the visible rows and offsets without constructing React elements. Layout calculations are independent of the DOM. Popup and trigger ViewModels compose a shared mouse gesture model instead of duplicating document listeners.

Property nodes compose an editor and a watch model. Live values and history snapshots use the same child builder and expansion traversal. Editing propagation is isolated because the inspected application can use a different MobX instance; that compatibility code does not belong in input handlers or views.

## Lifetime

The application owns settings, inspector, window, notifications and a popup-scoped store observer. The standalone entry additionally owns store discovery. `destroy()` releases their reactions, subscriptions and timers, removes the renderer, and permits a subsequent `define()`.

Popup ViewModels own their DOM listeners and dispose them through `unmountSignal`. The content ViewModel additionally releases its scrollbar, resize observer, animation frame, list reaction and scroll port when its element detaches. Closing the popup stops standalone polling; reopening refreshes the inspector immediately.

The two core configuration symbols remain independent. Only their store creation hooks are observed; devtools never replaces a host factory or copies defaults between core versions.

## Checks

- `pnpm --filter mobx-view-model-devtools check` runs the package's Biome rules and TypeScript check.
- `pnpm --filter mobx-view-model-devtools test` covers editing, history, disposal, VM nesting and window geometry.
- `pnpm test:e2e` builds the packages and exercises the published bundles: core compatibility, search, editing, settings, layout, keyboard interaction and visual snapshots.

## Large-store inspection

`ViewModelTree` indexes parents and children in one linear pass and cuts cycles into a forest. VM nodes read this index instead of filtering the full store per parent. Parent and depth queries follow the current index, including isolated-MobX notifications; deep-tree traversal is iterative.

`InspectorRows` stores inexpensive row factories. The content VM requests only the visible range plus overscan; sticky headers use binary search over group indices without constructing intervening rows. `createInspectorRows` snapshots expansion once per build, avoiding MobX dependencies on thousands of absent expansion keys. Explicitly expanded object branches and history keep their existing row order and closing markers. Plain-text search matches VM/property metadata before constructing property models; nested path resolution and Extras retain branch materialization.

The inspector caches VM nodes by object identity. On store changes it releases removed VM nodes, cached live/snapshot properties, watch-history nodes and expansion state, including VM that were never materialized. Replaced stores and Extras release old watchers. The store observer compares VM identity and parents using the host store directly, and only invalidates inspection when they change. It is shared by the module and standalone entries; standalone discovery observes only the global creation hooks. Above 100 VM, default VM expansion is disabled; explicit expand-all still uses lazy property factories.

`stories/DemoSession` owns the real demo store, devtools and updates. The React view queues session cleanup/creation outside React's commit phase because devtools owns another React root. Story changes reset scenario-controlled display and search state while preserving the production preference rules. The Storybook Vite config resolves one shared React runtime across workspace packages.

CI additionally builds Storybook and checks args changes, story switches, add/remove, far-ID search, singleton DOM ownership and live timer cleanup. See [PERFORMANCE.md](./PERFORMANCE.md) for the production opening benchmark.

## React and scrollbar DOM ownership

`ScrollbarLayout` renders SimpleBar's wrapper, scroll/content nodes, observers and tracks through React before initializing the scoped `simplebar-core` adapter. React therefore keeps the actual parent of conditional empty states, search suggestions and virtual rows; the adapter never reparents those nodes. The HTML API is not imported, so devtools does not initialize or rearrange host elements marked `data-simplebar`.

The initial viewport attachment does not clear an already-focused search input. Actual viewport disposal clears focus, listeners, timers and observers. Regression coverage includes no-result searches, source replacement, a scrolled large store and host-owned scrollbar DOM.

`ViewModelStoreSource` describes the version-neutral public lookup surface. Enumeration remains an internal read of the runtime map because core declares that member protected. Connections validate `viewModels.values()` before replacing the source or disposing any watchers; lookup-only objects and non-iterable collections fail with an explicit TypeError. Both core 8.0.0 and 8.10.1 are accepted without TypeScript casts. Old stores without creation hooks use explicit `connect`; their changes are detected by `ViewModelStoreObserver`, including an empty store when reopening.
