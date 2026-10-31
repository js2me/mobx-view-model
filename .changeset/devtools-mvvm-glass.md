---
'mobx-view-model-devtools': minor
---

Refactor devtools into composed inspector, settings, search, editing, history and window models. Add explicit disposal for the application and its connections, and replace the popup and trigger with a dark glass interface with subtle library accents. Preserve core 9–11 compatibility and existing theme preferences.

Index VM hierarchies in linear time and materialize inspector property models only for requested rows, including fully expanded large stores. Preserve cached models across reopening, prune removed VM state and watch history, and avoid eager property allocation for plain-text search. Add a connected Storybook playground with real large stores, lifecycle controls, reproducible performance measurements and browser regressions.

Reduce header padding and spacing. Restore the documentation site demo on core 11 using explicit instance registration, store-scoped annotations and visible loading errors.
