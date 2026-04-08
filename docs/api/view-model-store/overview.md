---
title: View Model Store Overview
---

# ViewModelStore  

An optional but powerful container for managing ViewModel instances within a React application. Provides centralized control over ViewModel lifecycle and access.

## Key Features
- **Instance Registry** - Automatic tracking of all active ViewModels in React tree
- **Cross-Component Access** - Retrieve ViewModels by:
  - Class reference
  - React Component reference
  - Custom unique IDs  
- **Factory Pattern** - Unified creation interface for ViewModels  

## When to Use
Consider ViewModelStore when your application requires:
- Access to ViewModels outside React hierarchy
- Debugging/devtools inspection capabilities
- Complex dependency injection scenarios


## Basic usage  

Integrate with React  

```tsx 
import { ViewModelStoreBase, ViewModelsProvider } from "mobx-view-model";

const vmStore = new ViewModelStoreBase();

const App = () => {
  return (
    <ViewModelsProvider value={vmStore}>
      <Notifier />
    </ViewModelsProvider>
  )
}
```

```tsx
import { ViewModelBase, withViewModel } from "mobx-view-model";

class NotifierVM extends ViewModelBase {
  foo = 'foo';
}

const NotifierView = () => {
  return <div>Hello, I am a notifier.</div>;
};

export const Notifier = withViewModel(NotifierVM, { id: 'notifier-id' })(
  NotifierView,
);

...
// somewhere in your app

vmStore.get(Notifier)?.foo // 'foo' | undefined
vmStore.get(NotifierVM)?.foo // 'foo' | undefined
vmStore.get('notifier-id')?.foo // 'foo' | undefined
```