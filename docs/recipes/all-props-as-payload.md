# Using all props as payload for your `ViewModel`   

This recipe helpful if you want to use all props as `payload` (`this.payload`) in your `ViewModel`.   


What you will need:   
- [`ViewModelBase`](/api/view-models/base-implementation) or custom implementation of [`ViewModel`](/api/view-models/interface) interface  
- [`withViewModel`](/react/api/with-view-model) HOC  

What you will do:
- Pass props type into first generic type parameter in `ViewModelBase` class
- Configure `withViewModel` HOC with `getPayload` function that returns all props as payload
- Override type of output React component into fixed type

```tsx{10,22,24}
import { withViewModel } from 'mobx-view-model';
import { ViewModelBase } from 'mobx-view-model';

interface ComponentProps {
  foo: number;
}

class YourVM extends ViewModelBase<ComponentProps> {
  
}

export const YourComponent = withViewModel(
  YourViewModel, 
  ({ model }) => {
    return (
      <div>{model.payload.foo}</div>
    )
  },
  {
    getPayload: (props) => props
  }
) as unknown as ComponentType<ComponentProps>

...

<YourComponent foo={1} />
```