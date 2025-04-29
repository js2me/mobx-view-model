# Getting started  

The `mobx-view-model` source code is written on TypeScript and compiled into NodeNext target.   

## Requirements  

- [`MobX`](https://mobx.js.org) **6+**  

## Installation

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

## Writing first ViewModels

```ts
import { observable } from 'mobx';
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

const PetCardView = observer(({ model }: ViewModelProps<PetCardVM>) => {

  return (
    <div className="p-10 flex flex-col gap-3">
      <span>{`Pet name: ${model.petName}`}</span>
      <input
        placeholer="name"
        value={model.petName}
        onChange={e => {
          model.setPetName(e.target.value);
        }}
      />
    </div> 
  )
})

export const PetCard = withViewModel(PetCardVM)(PetCardView)

...
<PetCard />
```
