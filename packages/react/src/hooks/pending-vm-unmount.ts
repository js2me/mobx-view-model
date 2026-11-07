import type {
  AnyViewModel,
  AnyViewModelSimple,
  ViewModelStore,
} from 'mobx-view-model';
import { runInAction } from 'mobx';

type VmInstance = AnyViewModel | AnyViewModelSimple;

// Client VMs without a store cannot use staging.
// setTimeout(0), not queueMicrotask: React 19 can yield to microtasks
// between fibers in one render pass. Schedule cleanup on the first acquire,
// never from render. Instances are deduplicated across shared owners.

const unconfirmed = new Set<VmInstance>();
let orphanCleanupScheduled = false;
const committedOwners = new WeakMap<VmInstance, number>();

/** Only committed fibers own a VM; confirm a new no-store VM on first acquire. */
export const acquireVm = (vm: VmInstance, confirmCreation?: boolean): void => {
  if (confirmCreation) {
    unconfirmed.delete(vm);
    if (unconfirmed.size && !orphanCleanupScheduled) {
      orphanCleanupScheduled = true;
      setTimeout(() => {
        orphanCleanupScheduled = false;
        for (const orphan of unconfirmed) {
          unconfirmed.delete(orphan);
          runInAction(() => orphan.unmount?.());
        }
      });
    }
  }
  committedOwners.set(vm, (committedOwners.get(vm) ?? 0) + 1);
};

export const releaseVm = (
  vm: VmInstance,
  store: ViewModelStore | null,
): void => {
  const owners = committedOwners.get(vm);
  if (!owners) return;
  if (owners > 1) {
    committedOwners.set(vm, owners - 1);
    return;
  }
  committedOwners.delete(vm);
  // The store may already have replaced this ID with a different instance.
  runInAction(() => {
    if (store && (vm.id == null || store.get(vm.id) === vm)) store.unmount(vm);
    else vm.unmount?.();
  });
};

/** Register a VM until its commit effect confirms it via {@link acquireVm}. */
export const registerUnconfirmed = (vm: VmInstance): VmInstance => {
  unconfirmed.add(vm);
  return vm;
};
