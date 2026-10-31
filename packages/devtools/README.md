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

## Contribution Guide    

Want to contribute ? [Follow this guide](https://github.com/js2me/mobx-view-model/blob/master/CONTRIBUTING.md)  
