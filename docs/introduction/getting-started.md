# Getting started  

The `mobx-view-model` source code is written in TypeScript and compiled with the `NodeNext` module target.   

## Requirements  

- [`MobX`](https://mobx.js.org) **^6**  
- [`React`](https://reactjs.org) **^18|^19** is required for the React integration    

## Installation

::: code-group

```bash [npm]
npm install {packageJson.name}
```

```bash [pnpm]
pnpm add {packageJson.name}
```

```bash [yarn]
yarn add {packageJson.name}
```

:::

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
import { observer } from "mobx-react-lite";
import { withViewModel, ViewModelProps } from "mobx-view-model";
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
