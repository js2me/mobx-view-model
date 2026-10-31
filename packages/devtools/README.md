<img src="https://js2me.github.io/mobx-view-model/logo.png" align="right" width="156" alt="logo" />

# mobx-view-model-devtools

[![NPM version][npm-image]][npm-url] [![test status][github-test-actions-image]][github-actions-url] [![build status][github-build-actions-image]][github-actions-url] [![npm download][download-image]][download-url] [![bundle size][bundlephobia-image]][bundlephobia-url]


[npm-image]: http://img.shields.io/npm/v/mobx-view-model-devtools.svg
[npm-url]: http://npmjs.org/package/mobx-view-model-devtools
[github-test-actions-image]: https://github.com/js2me/mobx-view-model/workflows/Test/badge.svg
[github-build-actions-image]: https://github.com/js2me/mobx-view-model/workflows/Build/badge.svg
[github-actions-url]: https://github.com/js2me/mobx-view-model/actions
[download-image]: https://img.shields.io/npm/dm/mobx-view-model-devtools.svg
[download-url]: https://npmjs.org/package/mobx-view-model-devtools
[bundlephobia-url]: https://bundlephobia.com/result?p=mobx-view-model-devtools
[bundlephobia-image]: https://badgen.net/bundlephobia/minzip/mobx-view-model-devtools


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
