# mobx-view-model-devtools

## 0.3.1

### Patch Changes

- 50829c1: Restore wheel, scrollbar-thumb and touch scrolling in the popup. Let SimpleBar detect overflowing content while keeping clipping on the outer rounded popup.

## 0.3.0

### Minor Changes

- 323e8f6: Fix React insertBefore/removeChild crashes when searches become empty or inspected sources change. Render scrollbar DOM through React and use the scoped SimpleBar core without its global HTML observer, preserving the host application's DOM. Preserve search focus during initial attachment and viewport reinitialization. Reject unsupported runtime store shapes before replacing a connected source.

  Standalone auto-discovery is verified with core 8.10.1 and core 9–11. Core 8.0.0 has no creation hook and requires `ViewModelDevtools.connect(store)`. Explicit module connections to both 8.0.0 and 8.10.1 use a version-neutral store type and popup-scoped observation, including isolated host MobX runtimes.

  Preserve backdrop blur on the popup and launcher in minified builds so host page content stays softly blurred behind the glass surface.

## 0.2.0

### Minor Changes

- 678ef31: Refactor devtools into composed inspector, settings, search, editing, history and window models. Add explicit disposal for the application and its connections, and replace the popup and trigger with a dark glass interface with subtle library accents. Preserve core 9–11 compatibility and existing theme preferences.

  Index VM hierarchies in linear time and materialize inspector property models only for requested rows, including fully expanded large stores. Preserve cached models across reopening, prune removed VM state and watch history, and avoid eager property allocation for plain-text search. Add a connected Storybook playground with real large stores, lifecycle controls, reproducible performance measurements and browser regressions.

  Reduce header padding and spacing. Restore the documentation site demo on core 11 using explicit instance registration, store-scoped annotations and visible loading errors.

### Patch Changes

- 678ef31: Restore standalone devtools auto-connection to core 9 and 10 alongside core 11. Discover stores regardless of script load order, resume updates when the panel opens, and detect VM replacements even when the store size stays unchanged.
- Updated dependencies [56bbaab]
  - mobx-view-model@11.0.1
  - mobx-view-model-react@11.0.1

## 0.1.5

### Patch Changes

- 3266f80: Update DevTools to use the separated `mobx-view-model-react` bindings.
- Updated dependencies [3266f80]
- Updated dependencies [3266f80]
- Updated dependencies [3266f80]
  - mobx-view-model@11.0.0
  - mobx-view-model-react@11.0.0

## 0.1.4

### Patch Changes

- 17ff760: fix problem with installation devtools via vite-plugin
- Updated dependencies [87bb630]
  - mobx-view-model@10.2.4

## 0.1.3

### Patch Changes

- 3bd28fa: [internal] update pnpm to latest for internal builds
- 3bd28fa: update yummies to latest (better tree shaking)
- Updated dependencies [3bd28fa]
- Updated dependencies [3bd28fa]
  - mobx-view-model@10.2.3

## 0.1.2

### Patch Changes

- 8641eb3: migration npm publish to trusted gh actions
- Updated dependencies [8641eb3]
  - mobx-view-model@10.2.2

## 0.1.1

### Patch Changes

- [#79](https://github.com/js2me/mobx-view-model/pull/79) [`98e294b`](https://github.com/js2me/mobx-view-model/commit/98e294ba692c8bdc473b59a402290e887e727967) Thanks [@js2me](https://github.com/js2me)! - Fix duplicate React in global build (resolve.dedupe for monorepo)

## 0.1.0

### Minor Changes

- [#77](https://github.com/js2me/mobx-view-model/pull/77) [`66330ce`](https://github.com/js2me/mobx-view-model/commit/66330ce165d0ac3d01a2687ca1794602892de9b2) Thanks [@js2me](https://github.com/js2me)! - Migrate packages into mobx-view-model monorepo
