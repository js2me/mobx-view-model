# Connect other components to `VMComponent`

This recipe shows how to connect another component (for example, a lazy wrapper) to the same `ViewModel` instance that your `VMComponent` uses.

Use this approach when:
- You load a `VMComponent` through `loadable()`
- You want `useViewModel(LazyComponent)` to return the same model
- You cannot pass [`anchors`](/react/api/with-view-model#anchors) in `withViewModel` config directly

This pattern is not tied to `react-simple-loadable`:  
you can use the same `connect()` approach with any React lazy-loading library or wrapper component.

Core idea:
- Call [`connect(anchor)`](/react/api/with-view-model#connectanchor) on the loaded `VMComponent`
- Pass the wrapper component as an anchor

```tsx{9}
import { loadable } from 'react-simple-loadable';
import { DialogSkeleton } from '@/shared/ui/dialogs/ui/dialog-skeleton';
import type { OrdersDialog as LoadedOrdersDialog } from './orders-dialog';

export const OrdersDialog = loadable(
  () =>
    import('./orders-dialog').then(
      ({ OrdersDialog: LoadedOrdersDialog }) => {
        LoadedOrdersDialog.connect(OrdersDialog);
        return LoadedOrdersDialog;
      },
    ),
  DialogSkeleton,
) as unknown as typeof LoadedOrdersDialog;
```

What happens here:
- `LoadedOrdersDialog` is a `VMComponent` created by `withViewModel`
- `connect(OrdersDialog)` registers the lazy wrapper as an anchor
- While `LoadedOrdersDialog` is mounted, `useViewModel(OrdersDialog)` points to the same `ViewModel`

If your anchor is known in advance, you can also use static [`anchors`](/react/api/with-view-model#anchors) in `withViewModel` config.  
Use `connect()` for dynamic or externally defined anchors.
