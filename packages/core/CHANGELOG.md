# mobx-view-model

## 10.0.5

### Patch Changes

- [`e79697a`](https://github.com/js2me/mobx-view-model/commit/e79697a1b50fa1c65e96ed3336156a309ab15257) Thanks [@js2me](https://github.com/js2me)! - [internal] updated ci/cd to improve gh workflows

- Updated dependencies [[`e79697a`](https://github.com/js2me/mobx-view-model/commit/e79697a1b50fa1c65e96ed3336156a309ab15257)]:
  - mobx-view-model-react@10.0.5

## 10.0.4

### Patch Changes

- [`2cae23d`](https://github.com/js2me/mobx-view-model/commit/2cae23d1163fd70e3636ae85354ce7285cbf162f) Thanks [@js2me](https://github.com/js2me)! - fixed async promise behabiour for vm base mount

- Updated dependencies []:
  - mobx-view-model-react@10.0.4

## 10.0.3

### Patch Changes

- [`8b35ea4`](https://github.com/js2me/mobx-view-model/commit/8b35ea432994803d9f0824769f54c9f1e16d1f2e) Thanks [@js2me](https://github.com/js2me)! - remove warning [#2](https://github.com/js2me/mobx-view-model/issues/2) about async mount (reason: there is no problem to use async mount)

- Updated dependencies [[`58de2dd`](https://github.com/js2me/mobx-view-model/commit/58de2dd0071e762a968c39796316ae91ebe50f39)]:
  - mobx-view-model-react@10.0.3

## 10.0.2

### Patch Changes

- [`fa0b390`](https://github.com/js2me/mobx-view-model/commit/fa0b3901a63da250ed16a476bb33a8ac18cee4bd) Thanks [@js2me](https://github.com/js2me)! - fixed typings after major update

- Updated dependencies [[`6a326a8`](https://github.com/js2me/mobx-view-model/commit/6a326a8ff3ad099fcc8d5eab24d9f378e81099cd)]:
  - mobx-view-model-react@10.0.2

## 10.0.1

### Patch Changes

- [`378e48b`](https://github.com/js2me/mobx-view-model/commit/378e48b6d9ae696dd069429b3320d03263e7c560) Thanks [@js2me](https://github.com/js2me)! - fix missing package build files

- Updated dependencies [[`378e48b`](https://github.com/js2me/mobx-view-model/commit/378e48b6d9ae696dd069429b3320d03263e7c560)]:
  - mobx-view-model-react@10.0.0

## 10.0.0

### Major Changes

- [#59](https://github.com/js2me/mobx-view-model/pull/59) [`4473e12`](https://github.com/js2me/mobx-view-model/commit/4473e1218da9486c630fcb358768e1d32cfaffee) Thanks [@js2me](https://github.com/js2me)! - `useCreateViewModel`: `attach` / `mount` now run in the hook body during the same render pass (after instance creation and `setPayload`), instead of only inside `useLayoutEffect`. `useLayoutEffect` is still used for teardown (`detach` / `unmount`). This changes timing relative to effects and child rendering compared to the previous release.

- [#59](https://github.com/js2me/mobx-view-model/pull/59) [`3ea47e5`](https://github.com/js2me/mobx-view-model/commit/3ea47e5711cee13db568cb6d0c0aeba86bb51cc1) Thanks [@js2me](https://github.com/js2me)! - Modified `ViewModelBase`/`ViewModelSimple` MobX reactions execution flow

  Call `flushPendingReactions()` after creating a view model in `useCreateViewModel` so MobX reactions scheduled during construction run before `attach`/`mount` in the same render pass. Previously reactions could flush later (e.g. after `mount()` when used under `mobx-react` `observer`), which changed effective execution order.

- [#65](https://github.com/js2me/mobx-view-model/pull/65) [`ac889c1`](https://github.com/js2me/mobx-view-model/commit/ac889c1ebab6fc1b36014a6a90b8e6f546fec3dc) Thanks [@js2me](https://github.com/js2me)! - Remove the deprecated `ViewModelBase#getParentViewModel` method.

  Use the `parentViewModel` getter directly; parent resolution now lives entirely in the base implementation.

### Minor Changes

- [#59](https://github.com/js2me/mobx-view-model/pull/59) [`f0d3729`](https://github.com/js2me/mobx-view-model/commit/f0d37296aae690f13b6f39f41dddd5eba969f460) Thanks [@js2me](https://github.com/js2me)! - add `flushPendingReactions` option to `viewModelsConfig`

- [#59](https://github.com/js2me/mobx-view-model/pull/59) [`2831cf2`](https://github.com/js2me/mobx-view-model/commit/2831cf29cd7fcec3a80e5675944b7d2e178ff565) Thanks [@js2me](https://github.com/js2me)! - improved SSR with Next.JS (hydration)

### Patch Changes

- [#59](https://github.com/js2me/mobx-view-model/pull/59) [`2a44bca`](https://github.com/js2me/mobx-view-model/commit/2a44bca92ee90b6aa314eb1014133545afee3259) Thanks [@js2me](https://github.com/js2me)! - added ssr example with NextJS (examples/ssr-nextjs)

- Updated dependencies [[`9ce86ce`](https://github.com/js2me/mobx-view-model/commit/9ce86cedf5912faae239c86fa673c9d7f34fe1fc)]:
  - mobx-view-model-react@9.3.2

## 9.3.1

### Patch Changes

- [`51a3fcc`](https://github.com/js2me/mobx-view-model/commit/51a3fcc3cfae2ad3177dbf2a2e72c8d588f1a52b) Thanks [@js2me](https://github.com/js2me)! - fixed typings for React dependent params (using React global namespace)

- Updated dependencies [[`51a3fcc`](https://github.com/js2me/mobx-view-model/commit/51a3fcc3cfae2ad3177dbf2a2e72c8d588f1a52b)]:
  - mobx-view-model-react@9.3.1

## 9.3.0

### Minor Changes

- [`c429474`](https://github.com/js2me/mobx-view-model/commit/c4294744ff79c3132341844aaf174807b158b6ff) Thanks [@js2me](https://github.com/js2me)! - move all React.js components hooks and etc to own package `mobx-view-model-react`

### Patch Changes

- Updated dependencies [[`c429474`](https://github.com/js2me/mobx-view-model/commit/c4294744ff79c3132341844aaf174807b158b6ff)]:
  - mobx-view-model-react@9.3.0
