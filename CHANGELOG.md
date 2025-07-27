# mobx-view-model

## 6.15.1

### Patch Changes

- [`be77b8f`](https://github.com/js2me/mobx-view-model/commit/be77b8f98dcbae1fe16afb7162c4da8832dbad2e) Thanks [@js2me](https://github.com/js2me)! - better documentation for `useViewModel` React hook

## 6.15.0

### Minor Changes

- [`794bc05`](https://github.com/js2me/mobx-view-model/commit/794bc053149664575a2f572d11ac5c02e021bbf2) Thanks [@js2me](https://github.com/js2me)! - pass previous version (second argument) of the payload in `payloadChanged` method for `ViewModelBase` and `ViewModel` interface

### Patch Changes

- [`6c542aa`](https://github.com/js2me/mobx-view-model/commit/6c542aa081561b7d3e995b43eeeadffbfaecb74b) Thanks [@js2me](https://github.com/js2me)! - rename `generateVMId` -> `generateVmId` internal vm id generator function

## 6.14.3

### Patch Changes

- [`7175147`](https://github.com/js2me/mobx-view-model/commit/7175147e74a4722b99bd1f8a25346b224a8794b2) Thanks [@js2me](https://github.com/js2me)! - added changelog link to docs

## 6.14.2

### Patch Changes

- [`5371f9b`](https://github.com/js2me/mobx-view-model/commit/5371f9be9f86ac127bc13d667cf204a9a91b2223) Thanks [@js2me](https://github.com/js2me)! - added documentation about view plugin (`mobx-view-model-vite-plugin`)

## 6.14.1

### Patch Changes

- [`98465f4`](https://github.com/js2me/mobx-view-model/commit/98465f4415447e03a59e20e4c7d6a82fb1599a3e) Thanks [@js2me](https://github.com/js2me)! - try to improve `HMR` with using `useMemo` hook inside `useCreateViewModel`

- [`98465f4`](https://github.com/js2me/mobx-view-model/commit/98465f4415447e03a59e20e4c7d6a82fb1599a3e) Thanks [@js2me](https://github.com/js2me)! - added unit tests for `ViewModelSimple` and its connection with `ViewModelStore`

## 6.14.0

### Minor Changes

- [`912a1a1`](https://github.com/js2me/mobx-view-model/commit/912a1a1bbdd67de5af5ade27d43dc0ff93aa3823) Thanks [@js2me](https://github.com/js2me)! - Added default implementation of `factory` property in `viewModelsConfig` global config object

### Patch Changes

- [`912a1a1`](https://github.com/js2me/mobx-view-model/commit/912a1a1bbdd67de5af5ade27d43dc0ff93aa3823) Thanks [@js2me](https://github.com/js2me)! - update documentation for all view models, add more links to source code

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
