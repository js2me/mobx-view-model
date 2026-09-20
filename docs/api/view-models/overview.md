---
title: View Models Overview
---

# ViewModel

A ViewModel keeps view-specific state, derived values, actions, and lifecycle work outside the UI component. MobX tracks observable values read by the view and updates that view when they change.

## Choose an implementation

- Use [`ViewModelSimple`](/api/view-models/view-model-simple) for a small MobX class with optional lifecycle methods. It is the quickest choice for local component state.
- Extend [`ViewModelBase`](/api/view-models/base-implementation) when you need payload handling, mounting lifecycle hooks, access to a `ViewModelStore`, or the built-in `unmountSignal`.

Connect a ViewModel with the [React integration](/react/integration) or [SolidJS integration](/solid/integration). For a conceptual introduction to the pattern, see [MVVM](https://en.wikipedia.org/wiki/Model%E2%80%93viewmodel).

## Example

```ts
import { ViewModelBase } from 'mobx-view-model';

export class CurrentUserBadgeVM extends ViewModelBase<{ userId: string }> {
  private userData = /* some data source */;

  get badgeTitle() {
    return `User badge: ${this.userData.fullName || ''}`;
  }

  get isLoading() {
    return this.userData.isLoading;
  }
}
```
