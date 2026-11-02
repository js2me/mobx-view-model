---
"mobx-view-model-vite-plugin": patch
---

Use AST parsing for ViewModel declarations and observer components, and analyze TypeScript before Vite erases interfaces. Resolve inherited classes and HMR consumers by their source modules, independently of transform order. Fall back to a full reload for instances whose private fields, computed getters, or own functions cannot be safely updated, checking all stores before applying changes.
