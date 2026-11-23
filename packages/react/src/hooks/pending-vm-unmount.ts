import type {
  AnyViewModel,
  AnyViewModelSimple,
  ViewModelStore,
} from 'mobx-view-model';
import { runInAction } from 'mobx';

type VmInstance = AnyViewModel | AnyViewModelSimple;

type Ownership = { count: number; store: ViewModelStore | null };
const owners = new WeakMap<VmInstance, Ownership>();

export function releaseVm(vm: VmInstance): void {
  const ownership = owners.get(vm);
  if (!ownership || --ownership.count > 0) return;
  owners.delete(vm);
  const { store } = ownership;
  // The store may already have replaced this ID with a different instance.
  runInAction(() => {
    if (store && (vm.id == null || store.get(vm.id) === vm)) store.unmount(vm);
    else vm.unmount?.();
  });
}

// A render may stay hidden across arbitrary commits. Only collection of its
// hook ref proves that an uncommitted owner can no longer mount.
const pendingOwners = typeof FinalizationRegistry === 'function'
  ? new FinalizationRegistry<VmInstance>(releaseVm)
  : undefined;

export function acquireVm(vm: VmInstance, store: ViewModelStore | null, pendingOwner?: object): void {
  // Transfer this render's existing ownership to its commit effect.
  if (pendingOwner && pendingOwners?.unregister(pendingOwner)) return;
  const ownership = owners.get(vm);
  if (ownership) {
    ownership.count++;
    if (store) ownership.store = store;
  } else {
    owners.set(vm, { count: 1, store });
  }
}

export function registerUnconfirmed(vm: VmInstance, owner: object): void {
  if (pendingOwners) {
    acquireVm(vm, null);
    pendingOwners.register(owner, vm, owner);
  }
}
