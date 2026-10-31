---
'mobx-view-model-devtools': patch
---

Fix React insertBefore/removeChild crashes when searches become empty or inspected sources change. Render scrollbar DOM through React and use the scoped SimpleBar core without its global HTML observer, preserving the host application's DOM. Preserve search focus during initial attachment and viewport reinitialization. Reject unsupported runtime store shapes before replacing a connected source.

Standalone auto-discovery is verified with core 8.10.1 and core 9–11. Core 8.0.0 has no creation hook and requires `ViewModelDevtools.connect(store)`. Explicit module connections to both 8.0.0 and 8.10.1 use a version-neutral store type and popup-scoped observation, including isolated host MobX runtimes.
