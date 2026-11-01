---
"mobx-view-model-devtools": minor
---

Add a persistent Group VM properties setting, enabled by default, that collects ViewModelBase members in a collapsed, expandable group and excludes them from search and suggestions.

Grouping takes precedence over `display.showInternals: false`. To fully hide base members, disable grouping as well (`display.groupViewModelBaseMembers: false`); saved user preferences take precedence over configuration defaults.
