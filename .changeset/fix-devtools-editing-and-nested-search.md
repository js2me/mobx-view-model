---
"mobx-view-model-devtools": patch
---

Fix blank nested search suggestions after a trailing dot, including `product.`, and correctly group or hide core 8–10 internals alongside core 11 properties.

Use native MobX writes and preserve computed dependency nodes when editing properties. Avoid global ViewModel refreshes and payload lifecycle calls, retain shared observable owners, and persist edits inside computed object, array, Map and Set snapshots.

Keep Set rows attached to their values across replacement and index changes without rebuilding unrelated members. Fix escaped strings, empty property names, undefined Map keys, sparse arrays and computed array length validation.
