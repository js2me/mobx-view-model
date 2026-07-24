# Getting started  

The `mobx-view-model` source code is written in TypeScript and compiled with the `NodeNext` module target.   

## Requirements  

- [`MobX`](https://mobx.js.org) **^6**  
- For **React**: [`React`](https://reactjs.org) **^18|^19** + [`mobx-view-model-react`](https://www.npmjs.com/package/mobx-view-model-react)  
- For **SolidJS**: [`solid-js`](https://www.solidjs.com) **^1.6** + [`mobx-solid`](https://www.npmjs.com/package/mobx-solid) + [`mobx-view-model-solid`](https://www.npmjs.com/package/mobx-view-model-solid)  

## Installation

::: code-group

```bash [npm]
npm install @{packageJson.name}
```

```bash [pnpm]
pnpm add @{packageJson.name}
```

```bash [yarn]
yarn add @{packageJson.name}
```

:::

React bindings:

```bash
pnpm add mobx-view-model-react mobx-react-lite
```

Solid bindings:

```bash
pnpm add mobx-view-model-solid mobx-solid solid-js
```

## Writing your first ViewModel

```ts
import { action, observable } from 'mobx';
import { ViewModelBase } from 'mobx-view-model';

class PetCardVM extends ViewModelBase {
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
import { withViewModel, ViewModelProps } from "mobx-view-model-react";
import { PetCardVM } from "./model";

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
  )
})

...
<PetCard />
```

See the full [React integration guide](/react/integration).

## Integration with SolidJS

```tsx
import { enableObservableTracking, withViewModel, type ViewModelProps } from "mobx-view-model-solid";
import { PetCardVM } from "./model";

enableObservableTracking();

export const PetCard = withViewModel(PetCardVM, (props: ViewModelProps<PetCardVM>) => {
  return (
    <div>
      <span>{`Pet name: ${props.model.petName}`}</span>
      <input
        placeholder="name"
        value={props.model.petName}
        onInput={(e) => {
          props.model.setPetName(e.currentTarget.value);
        }}
      />
    </div>
  );
});
```

See the full [SolidJS integration guide](/solid/integration).
