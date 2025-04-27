# RouteViewModel

Abstract class for integration with [`mobx-view-model` library](https://js2me.github.io/mobx-view-model)  

### Example

```tsx
import { RouteViewModel } from 'mobx-route/view-model';
import { routes } from '@/shared/config/routing';
import { withViewModel } from "mobx-view-model";

class UserDetailsRouteVM extends RouteViewModel<
  typeof routes.userDetails
> {
  route = routes.userDetails;
}

const UserDetailsPageView = () => {
  return <div>Details page</div>
}

export const UserDetailsPage =
  withViewModel(UserDetailsRouteVM)(UserDetailsPageView);
```
