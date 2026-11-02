<img src="https://js2me.github.io/mobx-view-model/logo.png" align="right" width="156" alt="logo" />

# mobx-view-model-devtools

[![NPM version][npm-image]][npm-url] [![Build and tests][github-actions-image]][github-actions-url] [![npm download][download-image]][download-url] [![bundle size][bundle-size-image]][bundle-size-url]


[npm-image]: https://img.shields.io/npm/v/mobx-view-model-devtools.svg
[npm-url]: https://www.npmjs.com/package/mobx-view-model-devtools
[github-actions-image]: https://github.com/js2me/mobx-view-model/actions/workflows/main.yml/badge.svg?branch=master
[github-actions-url]: https://github.com/js2me/mobx-view-model/actions/workflows/main.yml
[download-image]: https://img.shields.io/npm/dm/mobx-view-model-devtools.svg
[download-url]: https://www.npmjs.com/package/mobx-view-model-devtools
[bundle-size-url]: https://bundlejs.com/?q=mobx-view-model-devtools
[bundle-size-image]: https://deno.bundlejs.com/badge?q=mobx-view-model-devtools


⚡ DevTools for [mobx-view-model](https://www.npmjs.com/package/mobx-view-model) | Inspect ViewModels in real time ⚡

A standalone devtools panel for inspecting and debugging your `ViewModel` instances — state, payload, lifecycle, and arbitrary extra data.

> **Work in Progress** — the API and features may change at any time.

## [Read the docs →](https://js2me.github.io/mobx-view-model/other/dev-tools)


_Script tag (no npm install)_  
```html
<script
  async
  crossOrigin="anonymous"
  src="//unpkg.com/mobx-view-model-devtools/auto.global.js"
></script>
```

_Package import_  
```ts
import { ViewModelStoreBase } from "mobx-view-model";
import { ViewModelDevtools } from "mobx-view-model-devtools";

const viewModelStore = new ViewModelStoreBase();

ViewModelDevtools.connect(viewModelStore);
ViewModelDevtools.connectExtras({ rootStore });
```

_Development-only dynamic import_  
```ts
if (import.meta.env.DEV) {
  import("mobx-view-model-devtools").then(({ ViewModelDevtools }) => {
    ViewModelDevtools.connect(viewModelStore);
  });
}
```

## Architecture

The public `ViewModelDevtools` entry point composes the inspector, settings, window, and notifications. See [ARCHITECTURE.md](./ARCHITECTURE.md) for ownership, lifecycle, and test commands.

The panel uses dark glass by default. The appearance menu also supports light and system themes; saved choices take precedence over defaults. `ViewModelDevtools.define().destroy()` removes the panel and releases its subscriptions and timers.

**Group VM properties** is enabled by default and collects all `ViewModelBase` members in a collapsed **⚙️ _vm properties_** row. These members are excluded from search and suggestions while grouping is enabled. The preference is saved locally; `display.groupViewModelBaseMembers` sets its initial default.

Grouping takes precedence over **Show internals** (`display.showInternals`): base members remain available inside the group even when internals are hidden. To keep them completely hidden after upgrading, disable **Group VM properties** and **Show internals**, or configure both defaults:

```ts
display: { groupViewModelBaseMembers: false, showInternals: false }
```

Saved preferences take precedence over these configuration defaults.

## Contribution Guide    

Want to contribute ? [Follow this guide](https://github.com/js2me/mobx-view-model/blob/master/CONTRIBUTING.md)  

## Storybook and large stores

```sh
pnpm --filter mobx-view-model-devtools storybook
```

Open http://localhost:6006. The connected-store playground includes 100, 1,000 and 10,000 real ViewModels, flat and hierarchical stores, a fully expanded stress case, live updates and light/dark backgrounds. Controls recreate the session; buttons add/remove VM, update observable values and find the final VM. Sessions own and dispose their store, devtools, timers and animation frames.

```sh
pnpm --filter mobx-view-model-devtools build:storybook
pnpm --filter mobx-view-model-devtools test:storybook
```

Large stores default to collapsed VM nodes above 100 VM. Expand all keeps property models lazy, and reopening reuses cached models. See [PERFORMANCE.md](./PERFORMANCE.md) for measurements, reproduction commands and limits.

## Visual regression environment

Screenshot baselines are generated in the same pinned Playwright Ubuntu container used by CI. System fonts and Chromium rendering differ between Linux distributions; a native local run can legitimately differ from these baselines.

After `pnpm build`, run the browser suite from the repository root:

```sh
pnpm --filter mobx-view-model-devtools test:e2e:container --workers=2
```

For an intentional visual change, regenerate snapshots in that container, inspect the resulting PNGs, then run again without updating:

```sh
pnpm --filter mobx-view-model-devtools test:e2e:container --workers=2 --update-snapshots
```

Update the exact `@playwright/test` version, CI image and container script together. Failed CI runs upload browser screenshots/diffs and traces as `devtools-browser-diagnostics`.

Documentation screenshots use the actual 13-VM docs demo. With the production packages built and the [e2e fixture server](./PERFORMANCE.md#reproduce) running, refresh the images in `docs/public` with:

```sh
pnpm --filter mobx-view-model-devtools capture:docs
```

## Solid integration tests

The browser suite includes a real Solid app using `mobx-view-model-solid`,
`ViewModelsProvider`, `withViewModel`, `useCreateViewModel`, and MobX tracking.
It checks the VM hierarchy, observable/computed updates in both directions,
unmount/remount cleanup, and changes while the inspector is closed. Both the
module entry (explicit connection) and standalone script (automatic discovery)
run with the host loaded before and after devtools.

Run only these tests, including a fresh package build:

```sh
pnpm --filter mobx-view-model-devtools test:e2e solid.spec.ts --workers=2
```

## Core compatibility

The standalone bundle is tested with core 8.10.1, 9.3.16, 10.2.2 and 11.x in both script load orders, including isolated MobX runtimes. It discovers their store-creation hooks without replacing the host configuration.

Early core 8.0.0 has no global store-creation hook. Connect its store explicitly instead of relying on auto-discovery:

```ts
import { ViewModelDevtools } from 'mobx-view-model-devtools';

ViewModelDevtools.connect(viewModelStore);
```

The module entry is tested against both 8.0.0 and 8.10.1. The public store type uses their shared lookup API, so TypeScript consumers do not need casts to the current core version. A popup-scoped observer detects VM additions, replacements, removals and parent changes even when the host uses an isolated MobX runtime. Closing the popup stops observation; reopening refreshes immediately.


## Editing behavior and regression tests

Observable edits use native assignments or collection operations inside an action.
Setters, enhancers, interception and reaction batching stay in effect. Changes
inside plain ref/shallow values notify their nearest observable owner, without
scanning every VM or calling payload lifecycle methods.

Editing a computed pins an override, including computeds with a setter. Its atom
is retained so dependent computeds keep their normal MobX tracking and equality
checks. Nested plain snapshot edits pin the nearest computed owner. Observable
outputs are edited in place, and the parent getter can still replace them when
its dependencies change. Class instances returned by computeds are also edited
in place, preserving their prototype, private state and shared identity.
MobX-specific override internals are isolated in one
adapter; the shared-runtime behavior is tested with MobX 6.15.

Set rows use value identity rather than insertion index. Direct replacement
adds the replacement and removes the old member; other members are untouched.
Editing to an existing value merges rows. Interceptors remain authoritative; if
removal and rollback are both rejected, the error explains that both values remain.

The UI regression suite covers dependent computed graphs, repeated edits, keyboard
controls, failures, native notifications, stable Set DOM rows and nested search
completions. Legacy grouping is checked against real core 8.0, 8.10, 9, 10 and 11
instances. A trailing-dot search such as `product.` must show nonempty child names.

Run `pnpm --filter mobx-view-model-devtools test` and
`pnpm --filter mobx-view-model-devtools check:ui-tests` for these checks.


Metadata checks do not evaluate user getters. The explicit **Force update bound
view** action refreshes all existing observable and computed properties on that
VM, including plain in-place values whose reference did not change. Ordinary
property edits remain targeted. The explicit action also calls `setPayload`
with a shallow copy when the VM has an object or array payload and supports
`setPayload`. This can invoke application payload lifecycle code; ordinary
property edits do not call it.

Map drafts are rejected when their entry disappears or
changes identity, while an actual `undefined` key stays editable. The operation
selected when opening an editor stays fixed even if the live value changes type.
Map identity checks include every ancestor entry of a nested editor. Function
calls also retain their original function and receiver; stale calls are rejected
and argument or execution errors leave the draft open with a notification.
Symbol editor content preserves registered keys and unchanged local identities.

Base-property grouping uses each VM's actual base prototype, so core 11 business
properties named `vmConfig`, `vmParams` or `payloadChanged` stay visible and
searchable. Set rows share a reactive value-to-index snapshot instead of scanning
the collection for each row. Regression tests also cover repeated computed
overrides in an isolated MobX host and shallow Map values with foreign bundles.

Computed-output boundaries are exercised through the real editor UI:
[class identity and private state](tests/ui/review-regressions.test.tsx) stay
intact during in-place edits, while
[native Map snapshots](tests/ui/computed-dependencies.test.tsx) receive a pinned
copy and update dependent computeds without changing the original snapshot.

Map rows share a key index while observed. Value-only changes read their entry
directly without rebuilding that index. Native Map child-list rebuilds reread
their keys and invalidate existing positional rows when keys change. Reads
outside an observer use an early-exit entry scan instead of constructing a full
index. Map detection checks all required read methods (`entries`, `keys`, `get`).
Collapsed rows check for children without
creating their models, and object previews read at most 256 values. Copy performs
full serialization only when requested; serialization or clipboard failures show
a notification. These bounds are checked in
[performance regressions](tests/ui/performance-regressions.test.tsx).
