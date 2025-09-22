# mobx-view-model

## 8.2.2

### Patch Changes

- [`c249005`](https://github.com/js2me/mobx-view-model/commit/c249005c3f64dd54f0e44c5c0a250bb0faab6424) Thanks [@js2me](https://github.com/js2me)! - fixed build

## 8.2.1

### Patch Changes

- [`b595d0f`](https://github.com/js2me/mobx-view-model/commit/b595d0fb21236b7236b5a605e88d302eaa40fd5e) Thanks [@js2me](https://github.com/js2me)! - revert back build (fix yummies missing typings)

## 8.2.0

### Minor Changes

- [`cd2f8dc`](https://github.com/js2me/mobx-view-model/commit/cd2f8dc79851920705373029e21e969d934dae6c) Thanks [@js2me](https://github.com/js2me)! - migrate build from tsc -> zshy (same as tsc)

## 8.1.0

### Minor Changes

- [`868a5a6`](https://github.com/js2me/mobx-view-model/commit/868a5a6db4b73e951dfe7cc2da4f9e50f21bfbbf) Thanks [@js2me](https://github.com/js2me)! - refactor - switch build to zshy

## 8.0.1

### Patch Changes

- [`e9477ea`](https://github.com/js2me/mobx-view-model/commit/e9477ea0a65de6414e5b5392ebb024f0105f37c0) Thanks [@js2me](https://github.com/js2me)! - update README

## 8.0.0

### Major Changes

- [#24](https://github.com/js2me/mobx-view-model/pull/24) [`16d7a26`](https://github.com/js2me/mobx-view-model/commit/16d7a26a694eb1eed5854aa90f2d49d6dee67f70) Thanks [@js2me](https://github.com/js2me)! - removed all marked as deprecation properties and methods

  - Removed `config` property in `ViewModelParams` interface (renamed to `vmConfig`)
  - Removed `linkStore` method in `ViewModelSimple` interface (renamed to `attachViewModelStore`)
  - Removed type `ComponentWithLazyViewModel` (renamed to `VMLazyComponent`)
  - Removed type `ComponentWithViewModel` (renamed to `VMComponent`)
  - Removed `params` property in `ViewModelBase` class (renamed to `vmParams`)

- [#24](https://github.com/js2me/mobx-view-model/pull/24) [`16d7a26`](https://github.com/js2me/mobx-view-model/commit/16d7a26a694eb1eed5854aa90f2d49d6dee67f70) Thanks [@js2me](https://github.com/js2me)! - modified global payload processing

  Previosly `viewModelsConfig` haved the following configuration:

  ```ts
    comparePayload: 'strict',
    payloadObservable: 'ref',
    payloadComputed: false,
  ```

  So it was a bit performance overhead. Now it is:

  ```ts
    comparePayload: false,
    payloadComputed: 'struct',
    payloadObservable: 'ref',
  ```

### Minor Changes

- [#24](https://github.com/js2me/mobx-view-model/pull/24) [`16d7a26`](https://github.com/js2me/mobx-view-model/commit/16d7a26a694eb1eed5854aa90f2d49d6dee67f70) Thanks [@js2me](https://github.com/js2me)! - added default implementation for `generateId` property in global `viewModelsConfig`

- [#24](https://github.com/js2me/mobx-view-model/pull/24) [`16d7a26`](https://github.com/js2me/mobx-view-model/commit/16d7a26a694eb1eed5854aa90f2d49d6dee67f70) Thanks [@js2me](https://github.com/js2me)! - `id` property now is optional for implementation for `ViewModelSimple` interface

  Now you can do not implement `ViewModelSimple` interface to work with this library:

  ```tsx
  class MyVM {
    bar = '1'
  }
  ...
  const model = useCreateViewModel(MyVM);
  return <div>{model.bar}</div>;
  ```

  ```tsx
  class MyVM {
    foo = '1';
  }
  ...
  const YouComponent = withViewModel(MyVM, ({ model }) => {
    return <div>{model.foo}</div>
  });
  ```

- [#24](https://github.com/js2me/mobx-view-model/pull/24) [`16d7a26`](https://github.com/js2me/mobx-view-model/commit/16d7a26a694eb1eed5854aa90f2d49d6dee67f70) Thanks [@js2me](https://github.com/js2me)! - `parentViewModel` property for `ViewModelSimple` interface

### Patch Changes

- [#24](https://github.com/js2me/mobx-view-model/pull/24) [`16d7a26`](https://github.com/js2me/mobx-view-model/commit/16d7a26a694eb1eed5854aa90f2d49d6dee67f70) Thanks [@js2me](https://github.com/js2me)! - fixed typings for `ParentViewModel` generic type argument for all interfaces/classes (support AnyViewModelSimple)

## 7.2.0

### Minor Changes

- [`e9af54f`](https://github.com/js2me/mobx-view-model/commit/e9af54fe9decd320db6c93e149bfbd07480cacaa) Thanks [@js2me](https://github.com/js2me)! - updated docs for warning messages

## 7.1.0

### Minor Changes

- [`8e6a123`](https://github.com/js2me/mobx-view-model/commit/8e6a1232f3279f2685cbf4dfc9e61e0ac839c551) Thanks [@js2me](https://github.com/js2me)! - improved documentation for missing viewModels param error

## 7.0.1

### Patch Changes

- [`b84a501`](https://github.com/js2me/mobx-view-model/commit/b84a501561d9c4dc74790f8e3da4fba7d91e04bd) Thanks [@js2me](https://github.com/js2me)! - added keywords for npm

## 7.0.0

### Major Changes

- [`30907fe`](https://github.com/js2me/mobx-view-model/commit/30907fea494c1b7ca2260f1b46bd61c2d0e77b49) Thanks [@js2me](https://github.com/js2me)! - modify internal `ViewModel` ids generation. Counters starts from `1` (previously `0`) (`generateVmId`)

### Minor Changes

- [`7692d08`](https://github.com/js2me/mobx-view-model/commit/7692d08ecdd10d37fa1ac560b74ba1877ff32830) Thanks [@js2me](https://github.com/js2me)! - added type guards `isViewModel` and `isViewModelClass`

- [`756e0fe`](https://github.com/js2me/mobx-view-model/commit/756e0febac6f6a331244e6da8bb94ffac93abe99) Thanks [@js2me](https://github.com/js2me)! - passing props to `ViewModelBase` as ref

- [`7c82d2d`](https://github.com/js2me/mobx-view-model/commit/7c82d2d90ad0e4f39ae19df4faba563062f2cbe2) Thanks [@js2me](https://github.com/js2me)! - `protected` `props` property for `ViewModelBase` as reference to original component props (only `withViewModel` feature)

### Patch Changes

- [`7692d08`](https://github.com/js2me/mobx-view-model/commit/7692d08ecdd10d37fa1ac560b74ba1877ff32830) Thanks [@js2me](https://github.com/js2me)! - fix missing throwing exception in `useViewModel` hook

- [`b8bdd77`](https://github.com/js2me/mobx-view-model/commit/b8bdd771a26773acef7828a947e70a5d0e371a02) Thanks [@js2me](https://github.com/js2me)! - refactored useCreateViewModel

- [`b8bdd77`](https://github.com/js2me/mobx-view-model/commit/b8bdd771a26773acef7828a947e70a5d0e371a02) Thanks [@js2me](https://github.com/js2me)! - rename linkStore -> attachViewModelStore (ViewModelSimple)

## 6.16.1

### Patch Changes

- [`4793d23`](https://github.com/js2me/mobx-view-model/commit/4793d234fd1e9f2eaf97012f441041b87a8071cb) Thanks [@js2me](https://github.com/js2me)! - fixed bug with predefined function in `withViewModel` HOC

- [`4793d23`](https://github.com/js2me/mobx-view-model/commit/4793d234fd1e9f2eaf97012f441041b87a8071cb) Thanks [@js2me](https://github.com/js2me)! - typings for `ViewModelSimple` and `withViewModel` HOC

## 6.16.0

### Minor Changes

- [`b6d6884`](https://github.com/js2me/mobx-view-model/commit/b6d688408acc37656521f1aa0e0365eb6e709015) Thanks [@js2me](https://github.com/js2me)! - partial support `ViewModelSimple` for `withViewModel` HOC

- [`b8e408d`](https://github.com/js2me/mobx-view-model/commit/b8e408db4a6da64cac5e69d7069d1690d1d4e02d) Thanks [@js2me](https://github.com/js2me)! - support `ViewModelSimple` for `withLazyViewModel` HOC

## 6.15.2

### Patch Changes

- [`9a74d83`](https://github.com/js2me/mobx-view-model/commit/9a74d8389c9d246efbf7e05e7b0e54b1117f2a2b) Thanks [@js2me](https://github.com/js2me)! - rename ComponentWithLazyViewModel -> VMLazyComponent

- [`9a74d83`](https://github.com/js2me/mobx-view-model/commit/9a74d8389c9d246efbf7e05e7b0e54b1117f2a2b) Thanks [@js2me](https://github.com/js2me)! - rename type ComponentWithViewModel -> VMComponent

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
