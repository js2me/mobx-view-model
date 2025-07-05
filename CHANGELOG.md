# mobx-tanstack-query

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
