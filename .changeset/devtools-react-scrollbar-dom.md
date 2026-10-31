---
'mobx-view-model-devtools': patch
---

Fix React insertBefore/removeChild crashes when searches become empty or inspected sources change. Render scrollbar DOM through React and use the scoped SimpleBar core without its global HTML observer, preserving the host application's DOM. Preserve initial search focus and support explicit module connections to core 8.0.0/8.10.1 with a version-neutral store type and popup-scoped observation. Verify standalone auto-discovery on core 8.10.1 alongside core 9–11; early core 8 requires explicit connection because it has no creation hook.
