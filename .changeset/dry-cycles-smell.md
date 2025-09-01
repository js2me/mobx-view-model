---
"mobx-view-model": major
---

modified global payload processing   

Previosly `viewModelsConfig` haved the following configuration:   

```ts
  comparePayload: 'strict',
  payloadObservable: 'ref',
  payloadComputed: false,
```
So it was a bit performance overhead. Now it is:   
```ts
  comparePayload: false,
  payloadComputed: 'struct',
  payloadObservable: 'ref',
```

