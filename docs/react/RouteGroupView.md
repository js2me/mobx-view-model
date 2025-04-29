# RouteGroupView

Creates route views for [`RouteGroup`](/core/RouteGroup).  

### Example

```tsx
import { RouteGroupView } from 'mobx-route/react';
import { routes } from '@/shared/config/routing';

function Routing() {
  return (
    <>
      <RouteGroupView
        group={routes.memes}
        views={{
          list: () => <div>list</div>,
          details: () => <div>details</div>,
        }}
      />
    </>
  );
}
```
