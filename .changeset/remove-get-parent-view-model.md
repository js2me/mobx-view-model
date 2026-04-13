---
'mobx-view-model': major
---

Remove the deprecated `ViewModelBase#getParentViewModel` method.

Use the `parentViewModel` getter directly; parent resolution now lives entirely in the base implementation.
