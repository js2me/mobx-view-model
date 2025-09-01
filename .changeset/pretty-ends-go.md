---
"mobx-view-model": minor
---

`id` property not is optional for implementation for `ViewModelSimple` interface   

Now you can do not implement `ViewModelSimple` interface to work with this library:   

```tsx
class MyVM {
  bar = '1'
}
...
const model = useCreateViewModel(MyVM);
return <div>{model.bar}</div>;
```

```tsx
class MyVM {
  foo = '1';
}
...
const YouComponent = withViewModel(MyVM, ({ model }) => {
  return <div>{model.foo}</div>
});
```
