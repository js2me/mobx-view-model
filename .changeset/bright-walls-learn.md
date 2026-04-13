---
"mobx-view-model": major
---

`useCreateViewModel`: `attach` / `mount` now run in the hook body during the same render pass (after instance creation and `setPayload`), instead of only inside `useLayoutEffect`. `useLayoutEffect` is still used for teardown (`detach` / `unmount`). This changes timing relative to effects and child rendering compared to the previous release.
