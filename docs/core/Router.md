# Router

A class for centralized routing management.  
Provides a common interface for working with history, location, and route collections.  

## Constructor

```ts
new Router(config: RouterConfiguration)
```
Accepts configuration with route collection and routing settings.  

### Basic example

```ts
import {
  MobxLocation,
  QueryParams,
  Route,
  routeConfig,
  RouteGroup,
  Router,
} from 'mobx-route';

const history = new MobxHistory();
const location = new MobxLocation(history);
const queryParams = new QueryParams(location, history);

routeConfig.set({
  history,
  location,
  queryParams,
  baseUrl: '/base-url',
});

export const routes = {
  home: new Route('/'),
  projects: new RouteGroup({
    index: new Route('/projects', { index: true }),
    new: new Route('/projects/new'),
    details: new Route('/projects/:projectId'),
  }),
};

export const router = new Router({
  routes,
  history,
  location,
  queryParams,
});


router.routes.home.open();
router.navigate(router.router.home.createUrl());
router.history.back();
```

## Methods and properties  

### `routes: TRoutesCollection`  

Root collection of application routes. Can contain nested `RouteGroups`.  

Example:   
```ts
router.routes.home.open();
router.routes.admin.routes.dashboard.isOpened;  
```

### `history: IMobxHistory`  
Interface for managing browser history from [`mobx-location-history` package](https://github.com/js2me/mobx-location-history).  
Handles navigation operations.   

Example:  
```ts
router.history.back();
```

### `location: IMobxLocation`  
Reactive object with browser location from [`mobx-location-history` package](https://github.com/js2me/mobx-location-history).  

Example:
```ts
autorun(() => {
  console.log('Current path:', router.location.pathname);
});
```

### `query: IQueryParams`  
Interface for managing query parameters from [`mobx-location-history` package](https://github.com/js2me/mobx-location-history).  
Automatically synchronized with current url.  

Example:  
```ts
router.query.data; // { q: 'test' }
router.query.update({ bar: 1 });
router.query.data; // { q: 'test', bar: '1' }
```

### `navigate(url: string, options?): void` <Badge type="info" text="action" />   

Universal method for URL navigation.  

Examples:  
```ts
// Basic navigation
router.navigate('/about');

// With query parameters
router.navigate('/search', {
  query: { q: 'test' },
  replace: true
});

// Using generated URL
const url = router.routes.profile.createUrl({ userId: 42 });
router.navigate(url);
```