import type {
  AnyViewModel,
  AnyViewModelSimple,
  ViewModelStore,
} from 'mobx-view-model';
import { runInAction } from 'mobx';

type VmInstance = AnyViewModel | AnyViewModelSimple;

// Fallback for stores without staging (SSR / no-store).
// setTimeout(0), not queueMicrotask: React 19 can yield to microtasks
// between fibers in one render pass. Schedule cleanup from confirmCreation,
// never from render. Map is keyed by VM instance (shared explicit ids dedup).

export type UnconfirmedCreation = { vm: VmInstance };

const unconfirmed = new Map<VmInstance, ViewModelStore | null>();
let orphanCleanupScheduled = false;

/** Register a VM until its commit effect; cleanup is scheduled from {@link confirmCreation}. */
export const registerUnconfirmed = (
  vm: VmInstance,
  store: ViewModelStore | null,
): UnconfirmedCreation => {
  unconfirmed.set(vm, store);
  return { vm };
};

const scheduleOrphanCleanup = () => {
  if (orphanCleanupScheduled) return;
  orphanCleanupScheduled = true;
  setTimeout(() => {
    orphanCleanupScheduled = false;
    if (unconfirmed.size === 0) return;
    for (const [vm, store] of unconfirmed) {
      unconfirmed.delete(vm);
      runInAction(() => {
        if (store) store.unmount(vm);
        else vm.unmount?.();
      });
    }
  });
};

/** Fiber committed. Remaining unconfirmed entries are orphans. */
export const confirmCreation = (entry: UnconfirmedCreation): void => {
  unconfirmed.delete(entry.vm);
  if (unconfirmed.size > 0) {
    scheduleOrphanCleanup();
  }
};

export const unmountVm = (
  vm: VmInstance,
  store: ViewModelStore | null,
): void => {
  runInAction(() => {
    if (store) store.unmount(vm);
    else vm.unmount?.();
  });
};
