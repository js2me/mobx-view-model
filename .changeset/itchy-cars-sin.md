---
"mobx-view-model": major
---

Modified `ViewModelBase`/`ViewModelSimple` MobX reactions execution flow   

Call `flushPendingReactions()` after creating a view model in `useCreateViewModel` so MobX reactions scheduled during construction run before `attach`/`mount` in the same render pass. Previously reactions could flush later (e.g. after `mount()` when used under `mobx-react` `observer`), which changed effective execution order.


