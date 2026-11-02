---
"mobx-view-model-devtools": patch
---

- Fix editing of observable and computed properties, including nested objects and collections. Dependent computed values now update correctly.
- Restore nested search suggestions for paths such as `product.`.
- Fix framework-property grouping for core 8–11.
- Prevent open Map editors and function calls from switching to another entry when the collection changes.
- Speed up inspection of large objects, Maps and Sets.
