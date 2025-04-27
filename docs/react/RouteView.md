# RouteView

Creates route view.  

### Example

```tsx
import { RouteView } from 'mobx-route/react';
import { routes } from '@/shared/config/routing';

function Routing() {
  return (
    <>
      <RouteView route={routes.feed} view={FeedPage} />
      <RouteView route={routes.users} view={UsersPage} />
      <RouteView
        route={routes.userDetails}
        lazyView={async () =>
          (await import('@/pages/users/:userId')).UserDetailsPage
        }
        loader={GlobalLoader}
      />
    </>
  );
}
```
