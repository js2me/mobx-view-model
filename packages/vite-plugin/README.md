<img src="https://js2me.github.io/mobx-view-model/logo.png" align="right" width="156" alt="logo" />

# mobx-view-model-vite-plugin

[![NPM version][npm-image]][npm-url] [![test status][github-test-actions-image]][github-actions-url] [![build status][github-build-actions-image]][github-actions-url] [![npm download][download-image]][download-url] [![bundle size][bundlephobia-image]][bundlephobia-url]


[npm-image]: http://img.shields.io/npm/v/mobx-view-model-vite-plugin.svg
[npm-url]: http://npmjs.org/package/mobx-view-model-vite-plugin
[github-test-actions-image]: https://github.com/js2me/mobx-view-model/workflows/Test/badge.svg
[github-build-actions-image]: https://github.com/js2me/mobx-view-model/workflows/Build/badge.svg
[github-actions-url]: https://github.com/js2me/mobx-view-model/actions
[download-image]: https://img.shields.io/npm/dm/mobx-view-model-vite-plugin.svg
[download-url]: https://npmjs.org/package/mobx-view-model-vite-plugin
[bundlephobia-url]: https://bundlephobia.com/result?p=mobx-view-model-vite-plugin
[bundlephobia-image]: https://badgen.net/bundlephobia/minzip/mobx-view-model-vite-plugin


⚡ Vite plugin for [mobx-view-model](https://www.npmjs.com/package/mobx-view-model) | Smart HMR, displayName & devtools ⚡

Vite plugin that makes working with mobx-view-model smoother: smart HMR for ViewModel classes, automatic `displayName` for `observer()` components, and one-click devtools setup.

## [Read the docs →](https://js2me.github.io/mobx-view-model/other/vite-plugin)


_Basic setup_  
```ts
// vite.config.ts
import { mobxVmVitePlugin } from "mobx-view-model-vite-plugin";

export default {
  plugins: [mobxVmVitePlugin()],
};
```

_All features enabled in development_  
```ts
mobxVmVitePlugin({
  hmr: true,           // Smart HMR for ViewModel classes
  autoDisplayName: true, // displayName for observer() components
  devtools: {
    position: "top-right",
    defaultIsOpened: false,
  },
});
```

Nothing is injected in production builds.

## Contribution Guide    

Want to contribute ? [Follow this guide](https://github.com/js2me/mobx-view-model/blob/master/CONTRIBUTING.md)  
