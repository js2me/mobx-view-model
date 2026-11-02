<img src="https://js2me.github.io/mobx-view-model/logo.png" align="right" width="156" alt="logo" />

# mobx-view-model-vite-plugin

[![NPM version][npm-image]][npm-url] [![Build and tests][github-actions-image]][github-actions-url] [![npm download][download-image]][download-url] [![bundle size][bundle-size-image]][bundle-size-url]


[npm-image]: https://img.shields.io/npm/v/mobx-view-model-vite-plugin.svg
[npm-url]: https://www.npmjs.com/package/mobx-view-model-vite-plugin
[github-actions-image]: https://github.com/js2me/mobx-view-model/actions/workflows/main.yml/badge.svg?branch=master
[github-actions-url]: https://github.com/js2me/mobx-view-model/actions/workflows/main.yml
[download-image]: https://img.shields.io/npm/dm/mobx-view-model-vite-plugin.svg
[download-url]: https://www.npmjs.com/package/mobx-view-model-vite-plugin
[bundle-size-url]: https://bundlejs.com/?q=mobx-view-model-vite-plugin
[bundle-size-image]: https://deno.bundlejs.com/badge?q=mobx-view-model-vite-plugin


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
