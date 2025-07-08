<img src="assets/logo.png" align="right" width="156" alt="logo" />

# mobx-view-model  

[![NPM version][npm-image]][npm-url] [![test status][github-test-actions-image]][github-actions-url] [![build status][github-build-actions-image]][github-actions-url] [![npm download][download-image]][download-url] [![bundle size][bundlephobia-image]][bundlephobia-url]


[npm-image]: http://img.shields.io/npm/v/mobx-view-model.svg
[npm-url]: http://npmjs.org/package/mobx-view-model
[github-test-actions-image]: https://github.com/js2me/mobx-view-model/workflows/Test/badge.svg
[github-build-actions-image]: https://github.com/js2me/mobx-view-model/workflows/Build/badge.svg
[github-actions-url]: https://github.com/js2me/mobx-view-model/actions
[download-image]: https://img.shields.io/npm/dm/mobx-view-model.svg
[download-url]: https://npmjs.org/package/mobx-view-model
[bundlephobia-url]: https://bundlephobia.com/result?p=mobx-view-model
[bundlephobia-image]: https://badgen.net/bundlephobia/minzip/mobx-view-model


_MobX ViewModel power for ReactJS_   

Library for integration [MVVM](https://en.wikipedia.org/wiki/Model%E2%80%93view%E2%80%93viewmodel) pattern with [MobX](https://mobx.js.org/README.html) and [React](https://react.dev/).  

## Documentation is [here](https://js2me.github.io/mobx-view-model/)  


_with HOC_   
```tsx
import { withViewModel, ViewModelBase, ViewModelProps } from "mobx-view-model";
import { observer } from "mobx-react-lite";
import { action, observable } from "mobx";

class UserBadgeVM extends ViewModelBase<{ userId: Maybe<string> }> {
  private userSource = new UserSource({ abortSignal: this.unmountSignal });

  willMount() {
    this.userSource.connectWith(() => this.payload.userId)
  }

  get user() {
    return this.userSource.data;
  }

  get isAdmin() {
    return this.user?.isAdmin
  }
}

const UserBadgeView = observer(({ model }: ViewModelProps<UserBadgeVM>) => (
  <div className={'size-4 bg-[green]'}>
    <h3>{model.user?.fullName}</h3>
    {model.isAdmin && <span>admin</span>}
  </div>
))

export const UserBadge = withViewModel(UserBadgeVM)(UserBadgeView);
// export const UserBadge = withViewModel(UserBadgeVM, UserBadgeView);


// <UserBadge payload={{ userId: '1' }}>
```

_with hook_  
```tsx
import { ViewModelBase, ViewModelPayload, useCreateViewModel } from "mobx-view-model";
import { observer } from "mobx-react-lite";
import { action, observable } from "mobx";

class UserBadgeVM extends ViewModelBase<{ userId: Maybe<string> }> {
  private userSource = new UserSource({ abortSignal: this.unmountSignal });

  willMount() {
    this.userSource.connectWith(() => this.payload.userId)
  }

  get user() {
    return this.userSource.data;
  }

  get isAdmin() {
    return this.user?.isAdmin
  }
}

export const UserBadge = observer(({ userId }: ViewModelPayload<UserBadgeVM>) => {
  const model = useCreateViewModel(UserBadgeVM, { userId });

  return (
    <div className={'size-4 bg-[green]'}>
      <h3>{model.user?.fullName}</h3>
      {model.isAdmin && <span>admin</span>}
    </div>
  )
})


// <UserBadge payload={{ userId: '1' }}>
```

## Contribution Guide    

Want to contribute ? [Follow this guide](https://github.com/js2me/mobx-view-model/blob/master/CONTRIBUTING.md)  