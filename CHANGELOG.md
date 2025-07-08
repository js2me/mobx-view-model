# mobx-view-model

## 6.13.1

### Patch Changes

- [`612a7aa`](https://github.com/js2me/mobx-view-model/commit/612a7aafca29a83e80546ceedc67824af7de4b9e) Thanks [@js2me](https://github.com/js2me)! - add jsdoc for `withLazyViewModel` HOC

## 6.13.0

### Minor Changes

- [`69b796f`](https://github.com/js2me/mobx-view-model/commit/69b796f091ca63c11b2653d0421109e52f0ce699) Thanks [@js2me](https://github.com/js2me)! - `withLazyViewModel` HOC lazy load parameters + better overload for second arg

## 6.12.2

### Patch Changes

- [`994f059`](https://github.com/js2me/mobx-view-model/commit/994f059ced2d7f660fe925b86fe26a29f0a903c0) Thanks [@js2me](https://github.com/js2me)! - fix withViewModel overload typings

## 6.12.1

### Patch Changes

- [`8a01e1c`](https://github.com/js2me/mobx-view-model/commit/8a01e1c0164d730d927de1110b502f5a852bd1c2) Thanks [@js2me](https://github.com/js2me)! - fix withViewModel overload with model and component only

## 6.12.0

### Minor Changes

- [`5b8ef2c`](https://github.com/js2me/mobx-view-model/commit/5b8ef2caa6f3064ea5f8a46472bfc3c7e040f604) Thanks [@js2me](https://github.com/js2me)! - new overload for withLazyViewModel HOC for better DX (+ add docs for this)

- [`9ef99e9`](https://github.com/js2me/mobx-view-model/commit/9ef99e9fc6e644c3b80bfcfcad16ab97ff20163e) Thanks [@js2me](https://github.com/js2me)! - Added overload for `HOC` `withViewModel` - `withViewModel(VMClass, ViewComponent, config)` for better DX

## 6.11.3

### Patch Changes

- [`6fab326`](https://github.com/js2me/mobx-view-model/commit/6fab326bfa6266823d903780e9c87101ae829f36) Thanks [@js2me](https://github.com/js2me)! - fix `wrapViewsInObserver` option check on already wrapped components

- [`6fab326`](https://github.com/js2me/mobx-view-model/commit/6fab326bfa6266823d903780e9c87101ae829f36) Thanks [@js2me](https://github.com/js2me)! - Add Recipes documentation (How to wrap all view components in observer() HOC)

- [`6fab326`](https://github.com/js2me/mobx-view-model/commit/6fab326bfa6266823d903780e9c87101ae829f36) Thanks [@js2me](https://github.com/js2me)! - Update documentation for `ViewModelsConfig`. Added more examples

- [`6fab326`](https://github.com/js2me/mobx-view-model/commit/6fab326bfa6266823d903780e9c87101ae829f36) Thanks [@js2me](https://github.com/js2me)! - rename `config` to `vmConfig` in `ViewModelParams` (add deprecation). This was needed for more identical naming in all places in package

## 6.11.2

### Patch Changes

- [`e75ebd6`](https://github.com/js2me/mobx-view-model/commit/e75ebd6103c849ce3b7e10e2622396dd0ad1f41a) Thanks [@js2me](https://github.com/js2me)! - docs: fix logo size

## 6.11.1

### Patch Changes

- [`efc6ebe`](https://github.com/js2me/mobx-view-model/commit/efc6ebe6cdaef0107291ed5b4dbdc03410e22286) Thanks [@js2me](https://github.com/js2me)! - ci: fix gh releases

## 6.11.0

### Minor Changes

- [`7ea4aad`](https://github.com/js2me/mobx-view-model/commit/7ea4aad8b8380a4bcad53b666fa7a334cef338e7) Thanks [@js2me](https://github.com/js2me)! - ci: automatic gh release and npm release using changesets and gh workflows

## 6.0.0

### Major Changes

- [`1acb9ac`](https://github.com/js2me/mobx-view-model/commit/1acb9ac1526a3c2289e9b2a6282e24248027d2af) Thanks [@js2me](https://github.com/js2me)! - remove all 'deprecated' exports (ViewModelImpl -> ViewModelBase, ViewModelStoreImpl -> ViewModelStoreBase), remove 'renderHooks' property (was deprecated)
- [`3b84b48`](https://github.com/js2me/mobx-view-model/commit/3b84b4874def721593360360b8f7f733c018baa6) Thanks [@js2me](https://github.com/js2me)! - modified default 'comparePayload' value (prev lodash-es.isEqual, now mobx.comparer.structrual); feat: remove lodash-es as dependency package
