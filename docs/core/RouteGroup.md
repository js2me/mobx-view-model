# RouteGroup  

Class for grouping related routes and managing their state.
Allows to organize routes into hierarchical structures.   

## Constructor  
```ts
new RouteGroup(routes: TRoutesCollection)
```
Accepts an object with a collection of routes/groups.
Routes can be either regular `Route` objects or other entities, such as `RouteGroup` or `VirtualRoute`.  

### Basic example

```ts
const routesGroup = new RouteGroup({
  index: new Route('/', { index: true }),
  fruits: new Route('/fruits'),
  zombies: new Route('/zombies'),
  memes: new RouteGroup({
    index: new Route('/memes', { index: true }),
    list: new Route('/memes/list'),
    create: new Route('/memes/create'),
    edit: new Route('/memes/edit/:id'),
  }),
})
```

## Methods and properties  


### `isOpened: boolean` <Badge type="tip" text="computed" />   

Returns `true` if at least one route in the group is open.  

Example:  
```ts
const group = new RouteGroup({
  home: new Route('/'),
  about: new Route('/about')
});

group.routes.home.open();
group.isOpened; // true
```


### `open(...args: any[]): void` <Badge type="tip" text="action" />   

Main navigation method for the group. Behavior:  
1. Looks for an index route (with the `index: true` flag) in the group  
2. If an index route is found, opens it  
2. If no index route is found, tries to open the last nested group  
3. If there are no routes in the group, displays a warning (in DEV mode)   

Example:  
```ts
const group = new RouteGroup({
  index: new Route('/', { index: true }),
  other: new Route('/other')
});
group.open(); // Navigates to /

// Sending arguments
const paramGroup = new RouteGroup({
  index: new Route('/user/:id', { index: true })
});
paramGroup.open({ id: 42 }); // /user/42
```
