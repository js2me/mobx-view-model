# Getting started  

`mobx-view-model` provides framework-agnostic view models; install the bindings for your UI framework separately.

## Requirements  

- [`MobX`](https://mobx.js.org) **^6.12.4**
- For **React**: [`React`](https://react.dev) and `react-dom` **^18 or ^19**, `mobx-react-lite` **^4.0.7**, and [`mobx-view-model-react`](https://www.npmjs.com/package/mobx-view-model-react)
- For **SolidJS**: [`solid-js`](https://www.solidjs.com) **^1.9.9**, [`mobx-solid`](https://www.npmjs.com/package/mobx-solid) **^0.3.1**, and [`mobx-view-model-solid`](https://www.npmjs.com/package/mobx-view-model-solid)

## Installation

::: code-group

```bash [npm]
npm install @{packageJson.name} mobx
```

```bash [pnpm]
pnpm add @{packageJson.name} mobx
```

```bash [yarn]
yarn add @{packageJson.name} mobx
```

:::

React bindings:

```bash
pnpm add mobx-view-model-react mobx-react-lite react react-dom
```

Solid bindings:

```bash
pnpm add mobx-view-model-solid mobx-solid solid-js
```

The React and Solid examples below use MobX decorators; see [MobX decorators](/introduction/decorators) for build setup and an alternative without decorators.

## Writing your first ViewModel

```ts
import { action, observable } from 'mobx';
import { ViewModelBase } from 'mobx-view-model';

export class PetCardVM extends ViewModelBase {
  @observable
  accessor petName: string = '';

  @action.bound
  setPetName(petName: string) {
    this.petName = petName;
  }
}
```

## Integration with React

```tsx
import { withViewModel } from 'mobx-view-model-react';
import { PetCardVM } from './model';

export const PetCard = withViewModel(PetCardVM, ({ model }) => {
  return (
    <div className="p-10 flex flex-col gap-3">
      <span>{`Pet name: ${model.petName}`}</span>
      <input
        placeholder="name"
        value={model.petName}
        onChange={e => {
          model.setPetName(e.target.value);
        }}
      />
    </div>
  );
});
```

Render `<PetCard />` in your application.

See the full [React integration guide](/react/integration).

## <SolidMark /> Integration with SolidJS

```tsx
import {
  enableObservableTracking,
  withViewModel,
  type ViewModelProps,
} from 'mobx-view-model-solid';
import { PetCardVM } from './model';

enableObservableTracking();

export const PetCard = withViewModel(PetCardVM, ({ model }) => {
  return (
    <div>
      <span>{`Pet name: ${model.petName}`}</span>
      <input
        placeholder="name"
        value={model.petName}
        onInput={(e) => {
          model.setPetName(e.currentTarget.value);
        }}
      />
    </div>
  );
});
```

See the full [SolidJS integration guide](/solid/integration).
