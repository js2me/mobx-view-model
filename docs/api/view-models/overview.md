---
title: View Models Overview
---

# ViewModel

The ViewModel is a core component of the [`MVVM`](https://en.wikipedia.org/wiki/Model%E2%80%93view%E2%80%93viewmodel) architectural pattern, serving as a bridge between the view (UI layer) and model (data/business logic layer). 

## Key Responsibilities
As the central processing unit for views in your application, the ViewModel:
- Manages data flow from models to UI components
- Encapsulates view-specific business logic
- Maintains a clean separation between presentation and domain layers
- Handles component lifecycle and state management
- Provides computed properties and actions for UI interaction

## Architectural Role
This implementation leverages MobX's granular reactivity system to:
1. Automatically synchronize view updates with ViewModel state changes
2. Maintain strict independence between architectural layers
3. Enable efficient state propagation through observable properties
4. Optimize re-renders using MobX's fine-grained tracking

The ViewModel can serve as a mediator that:
- **Abstracts complex data transformations** - Formats raw model data for UI consumption
- **Handles side effects** - Manages async operations and external interactions
- **Exposes clean APIs** - Provides well-defined interfaces for UI components
- **Manages component state** - Handles loading, error, and success states
- **Controls component lifecycle** - Manages mounting, unmounting, and updates

## Benefits
The ViewModel pattern delivers:
- **Enhanced testability** - Verify logic without rendering
- **Improved maintainability** - Independent layer evolution
- **Better collaboration** - Parallel work on UI and business logic
- **Reusability** - Share ViewModels across multiple components
- **Type safety** - Full TypeScript support with generics

## Example  

```ts
import { ViewModelBase } from "mobx-view-model";

export class CurrentUserBadgeVM extends ViewModelBase<{ userId: string }> {
  private userData = /* some data source */

  get badgeTitle() {
    return `user badge: ${this.userData.fullName || ''}`
  }

  get isLoading() {
    return this.userData.isLoading;
  }
}
```

## Articles
- [Understanding MVVM Pattern](https://www.ramotion.com/blog/what-is-mvvm/)
- [MobX Documentation](https://mobx.js.org/README.html)
- [React Best Practices with MobX](https://mobx.js.org/react-integration.html)