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
| `model/connection/` | Standalone discovery and observation of core 9–11 stores |
| `ui/` | Views, their ViewModels, DOM measurement, scrollbars and the React renderer |

Views choose and render React components. ViewModels expose state and commands; the content ViewModel exposes the visible rows and offsets without constructing React elements. Layout calculations are independent of the DOM. Popup and trigger ViewModels compose a shared mouse gesture model instead of duplicating document listeners.

Property nodes compose an editor and a watch model. Live values and history snapshots use the same child builder and expansion traversal. Editing propagation is isolated because the inspected application can use a different MobX instance; that compatibility code does not belong in input handlers or views.

## Lifetime

The application owns settings, inspector, window, notifications and the standalone connection. `destroy()` releases their reactions, subscriptions and timers, removes the renderer, and permits a subsequent `define()`.

Popup ViewModels own their DOM listeners and dispose them through `unmountSignal`. The content ViewModel additionally releases its scrollbar, resize observer, animation frame, list reaction and scroll port when its element detaches. Closing the popup stops standalone polling; reopening refreshes the inspector immediately.

The two core configuration symbols remain independent. Only their store creation hooks are observed; devtools never replaces a host factory or copies defaults between core versions.

## Checks

- `pnpm --filter mobx-view-model-devtools check` runs the package's Biome rules and TypeScript check.
- `pnpm --filter mobx-view-model-devtools test` covers editing, history, disposal, VM nesting and window geometry.
- `pnpm test:e2e` builds the packages and exercises the published bundles: core compatibility, search, editing, settings, layout, keyboard interaction and visual snapshots.
