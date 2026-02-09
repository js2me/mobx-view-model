# Use generic ViewModel types in React components

This recipe shows how to keep a generic type (`TUser`) in your `ViewModel` and pass it through a React component built with [`withViewModel`](/react/api/with-view-model).

What you will need:
- A `ViewModel` implementation with generic types (for example `UserSelectVM<TUser>`)
- [`withViewModel`](/react/api/with-view-model) HOC
- `VMComponentProps` types

What you will do:
- Add a generic parameter to your view component props
- Use `ViewModelProps` to connect props to a generic `ViewModel`
- Cast the resulting component to preserve the generic call signature

```tsx{3,10,11,20,21,22} 
// view.tsx

interface UserSelectUIProps<TUser = any> {
  loading?: boolean;
  className?: string;
  render: (item: TUser) => ReactNode;
}

export const UserSelect = withViewModel<
  UserSelectVM,
  UserSelectUIProps
>(
  UserSelectVM,
  ({
    model,
    ...uiProps,
  }) => {
    ...
  },
) as unknown as <TUser = any>(
  props: VMComponentProps<UserSelectVM<TUser>, UserSelectUIProps>,
) => ReactNode;

export type UserSelectProps<TUser = any> = ComponentProps<
  typeof UserSelect<TUser>
>;

```

```ts
// model.ts

export class UserSelectVM<TUser = any> extends ViewModelBase {
  ...
}
```


Why the cast is needed:
- `withViewModel` returns a concrete `ComponentType`, so TypeScript loses the generic call signature.
- The explicit `as unknown as <TUser = any>(...) => ReactNode` restores the generic component API for consumers.
