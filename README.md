<img src="assets/logo.png" align="right" height="156" alt="logo" />

# mobx-view-model  

[![NPM version][npm-image]][npm-url] [![test status][github-test-actions-image]][github-actions-url] [![build status][github-build-actions-image]][github-actions-url] [![npm download][download-image]][download-url] [![bundle size][bundlephobia-image]][bundlephobia-url]


[npm-image]: http://img.shields.io/npm/v/mobx-view-model.svg
[npm-url]: http://npmjs.org/package/mobx-view-model
[github-test-actions-image]: https://github.com/js2me/mobx-view-model/workflows/Test/badge.svg
[github-build-actions-image]: https://github.com/js2me/mobx-view-model/workflows/Build/badge.svg
[github-actions-url]: https://github.com/js2me/mobx-view-model/actions
[download-image]: https://img.shields.io/npm/dm/mobx-view-model.svg
[download-url]: https://npmjs.org/package/mobx-view-model
[bundlephobia-url]: https://bundlephobia.com/result?p=mobx-view-model
[bundlephobia-image]: https://badgen.net/bundlephobia/minzip/mobx-view-model


_MobX ViewModel power for ReactJS_   


[**DOCUMENTATION**](https://js2me.github.io/mobx-view-model/)   



<!-- 
#### Usage   

**1.** Simple   

```tsx
import { View } from "./view";
import { Model } from "./model";

export const Component = withViewModel(Model)(View?)  

...

<Component />
```   

**2.** Custom factory   

Advanced usage that needed to create your own implementations of `withViewModel` HOC, `ViewModelStore` and `ViewModel`  

```tsx
import { View } from "./view";
import { Model } from "./model";

export const Component = withViewModel(Model, {
  factory: (config) => {
    // also you can achieve this your view model store implementation
    return new config.VM(rootStore, config);
  }
})(View?)  

...

<Component />
```    -->
