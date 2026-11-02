---
"mobx-view-model-devtools": patch
---

Fix blank nested search suggestions after a trailing dot, including `product.`, and correctly group or hide core 8–10 internals alongside core 11 properties.

Use native MobX writes and preserve computed dependency nodes when editing properties. Avoid global ViewModel refreshes and payload lifecycle calls, retain shared observable owners, and persist edits inside computed object, array, Map and Set snapshots.

Keep Set rows attached to their values across replacement and index changes without rebuilding unrelated members. Fix escaped strings, empty property names, undefined Map keys, sparse arrays and computed array length validation.

Reject stale Map drafts without forbidding undefined keys, preserve explicit refreshes of same-reference data, avoid getter evaluation during metadata checks, and share Set index lookups. Determine base fields from each VM's actual core base, preserving core 11 application properties with legacy names.

Validate Map ancestors for nested drafts and preserve function-call targets while editing. Report call errors without losing the draft, retain class identity and private state in computed outputs, and round-trip Symbol editor content correctly.
