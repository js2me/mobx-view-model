import type { AnyVM } from './types';

/** A linear forest index. Invalid parents and cycles are promoted to roots. */
export class ViewModelTree {
  readonly roots: AnyVM[] = [];
  readonly children = new Map<AnyVM, AnyVM[]>();
  readonly parents = new Map<AnyVM, AnyVM>();

  constructor(readonly viewModels: readonly AnyVM[]) {
    const connected = new Set(viewModels);
    for (const vm of viewModels) {
      const parent = vm.parentViewModel;
      if (parent && parent !== vm && connected.has(parent))
        this.parents.set(vm, parent);
    }
    const completed = new Set<AnyVM>();
    for (const vm of viewModels) {
      const path = new Set<AnyVM>();
      let current: AnyVM | undefined = vm;
      while (current && !completed.has(current)) {
        if (path.has(current)) {
          this.parents.delete(current);
          break;
        }
        path.add(current);
        current = this.parents.get(current);
      }
      for (const visited of path) completed.add(visited);
    }
    for (const vm of viewModels) {
      const parent = this.parents.get(vm);
      if (!parent) this.roots.push(vm);
      else {
        const children = this.children.get(parent);
        if (children) children.push(vm);
        else this.children.set(parent, [vm]);
      }
    }
  }
}
