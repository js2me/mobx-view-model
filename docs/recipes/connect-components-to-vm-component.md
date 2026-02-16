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
import { DrawerModalLayoutSkeleton } from '@/shared/ui/dialogs/ui/drawer-skeleton';
import type { OrdersDrawer as LoadedOrdersDrawer } from './orders-drawer';

export const OrdersDrawer = loadable(
  () =>
    import('./orders-drawer').then(
      ({ OrdersDrawer: LoadedOrdersDrawer }) => {
        LoadedOrdersDrawer.connect(OrdersDrawer);
        return LoadedOrdersDrawer;
      },
    ),
  DrawerModalLayoutSkeleton,
) as unknown as typeof LoadedOrdersDrawer;
```

What happens here:
- `LoadedOrdersDrawer` is a `VMComponent` created by `withViewModel`
- `connect(OrdersDrawer)` registers the lazy wrapper as an anchor
- While `LoadedOrdersDrawer` is mounted, `useViewModel(OrdersDrawer)` points to the same `ViewModel`

If your anchor is known in advance, you can also use static [`anchors`](/react/api/with-view-model#anchors) in `withViewModel` config.  
Use `connect()` for dynamic or externally defined anchors.
