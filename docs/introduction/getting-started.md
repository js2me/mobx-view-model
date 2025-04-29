---
title: Getting started
---

# Getting started

## Installation

::: warning
{packageJson.name} currently is WIP project. This is not production ready.  
:::

::: code-group

```bash [npm]
npm install {packageJson.name}
```

```bash [yarn]
yarn add {packageJson.name}
```

```bash [pnpm]
pnpm add {packageJson.name}
```

:::

## Integration with React

```tsx
import { Route } from "mobx-route";
import { RouteView, Link } from "mobx-route/react";

const route = new Route('/foo/bar/:baz');

...
<RouteView route={route} view={() => <div>Hello!</div>} />
...
<Link route={route} params={{ baz: 1 }} />
```

## Writing first routes

```ts
import { Route, RouteGroup } from 'mobx-route';

const feed = new Route('/');
const users = new Route('/users');
const userDetails = users.extend('/:userId');

export const routes = {
  feed,
  users,
  userDetails,
  memes: new RouteGroup({
    list: new Route('/memes', { index: true }),
    details: new Route('/memes/:memeId'),
  })
}
```

## Attach routes to views in React  

```tsx
import { observer } from "mobx-react-lite";
import { routes } from '@/shared/config/routing';
import { RouteView, Link } from 'mobx-route/react';

const AllUsersPage = () => {
  return (
    <div>
      <Link route={routes.userDetails} params={{ userId: 1 }}>
        Open user with id 1
      </Link>
    </div>
  );
};

const UserDetailsPage = observer(() => {
  const { params } = routes.userDetails.data!;

  return (
    <div>
      {`User id: ${params.userId}`}
    </div>
  )
})

export const App = () => {
  return (
    <div>
      <RouteView route={routes.userDetails} view={AllUsersPage} />
      <RouteView route={routes.users} view={UserDetailsPage} />
    </div>
  )
}
```
