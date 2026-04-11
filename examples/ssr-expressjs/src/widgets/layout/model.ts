import { computed, makeObservable } from "mobx";
import { VM } from "../../shared/lib/view-models/vm";

export class LayoutVM extends VM {
  get navItems() {
    return [
    { 
      label: 'Main',
      path: '/'
    },
    {
      label: 'Cart',
      path: '/cart',
    },
    {
      label: 'About',
      path: '/about',
    }
  ]
  }


  protected willMount(): void {
    makeObservable(this, { 
      navItems: computed.struct,
    })
  }
}