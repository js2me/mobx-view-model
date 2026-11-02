<img src="https://js2me.github.io/mobx-view-model/logo.png" align="right" width="156" alt="logo" />

# mobx-view-model-react

[![NPM version][npm-image]][npm-url] [![Build and tests][github-actions-image]][github-actions-url] [![npm download][download-image]][download-url] [![bundle size][bundle-size-image]][bundle-size-url]


[npm-image]: https://img.shields.io/npm/v/mobx-view-model-react.svg
[npm-url]: https://www.npmjs.com/package/mobx-view-model-react
[github-actions-image]: https://github.com/js2me/mobx-view-model/actions/workflows/main.yml/badge.svg?branch=master
[github-actions-url]: https://github.com/js2me/mobx-view-model/actions/workflows/main.yml
[download-image]: https://img.shields.io/npm/dm/mobx-view-model-react.svg
[download-url]: https://www.npmjs.com/package/mobx-view-model-react
[bundle-size-url]: https://bundlejs.com/?q=mobx-view-model-react
[bundle-size-image]: https://deno.bundlejs.com/badge?q=mobx-view-model-react


⚡ React bindings for [mobx-view-model](https://www.npmjs.com/package/mobx-view-model) | HOCs, hooks & providers ⚡

React integration layer for the [MVVM](https://en.wikipedia.org/wiki/Model%E2%80%93view%E2%80%93viewmodel) library — connect ViewModels to components via `withViewModel`, `useCreateViewModel`, `ViewModelsProvider`, and more.

## [Read the docs →](https://js2me.github.io/mobx-view-model/react/integration)


_React's HOC approach_   
```tsx
import { ViewModelBase } from "mobx-view-model";
import { withViewModel, ViewModelProps } from "mobx-view-model-react";
import { observer } from "mobx-react-lite";
import { action, observable } from "mobx";

class UserBadgeVM extends ViewModelBase<{ userId: Maybe<string> }> {
  private userSource = new UserSource({ abortSignal: this.unmountSignal });

  protected willMount() {
    this.userSource.connectWith(() => this.payload.userId)
  }

  get user() {
    return this.userSource.data;
  }

  get isAdmin() {
    return this.user?.isAdmin
  }
}

...

export const UserBadge = withViewModel(UserBadgeVM, ({ model }) => (
  <div className={'size-4 bg-[green]'}>
    <h3>{model.user?.fullName}</h3>
    {model.isAdmin && <span>admin</span>}
  </div>
));

...

<UserBadge payload={{ userId: '1' }} />
```

_React's hook approach_  
```tsx
import { ViewModelBase, ViewModelPayload } from "mobx-view-model";
import { useCreateViewModel } from "mobx-view-model-react";
import { observer } from "mobx-react-lite";
import { action, observable } from "mobx";

class UserBadgeVM extends ViewModelBase<{ userId: Maybe<string> }> {
  private userSource = new UserSource({ abortSignal: this.unmountSignal });

  protected willMount() {
    this.userSource.connectWith(() => this.payload.userId)
  }

  get user() {
    return this.userSource.data;
  }

  get isAdmin() {
    return this.user?.isAdmin
  }
}

...

export const UserBadge = observer(({ userId }: ViewModelPayload<UserBadgeVM>) => {
  const model = useCreateViewModel(UserBadgeVM, { userId });

  return (
    <div className={'size-4 bg-[green]'}>
      <h3>{model.user?.fullName}</h3>
      {model.isAdmin && <span>admin</span>}
    </div>
  )
})

...

<UserBadge payload={{ userId: '1' }}/>
```

## Contribution Guide    

Want to contribute ? [Follow this guide](https://github.com/js2me/mobx-view-model/blob/master/CONTRIBUTING.md)  
