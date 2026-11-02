---
"mobx-view-model-vite-plugin": patch
---

Fix hot updates that could crash ViewModels or leave old code running. Reload the page when an update cannot safely preserve state. Also fix component names and ViewModel detection in files with comments, template strings, or inherited classes.
