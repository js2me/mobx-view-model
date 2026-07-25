import type { AnyViewModel, AnyViewModelSimple } from 'mobx-view-model';
import { runInAction } from 'mobx';
import type { Class } from 'yummies/types';

type VmInstance = AnyViewModel | AnyViewModelSimple;

type PendingUnmount = {
  vm: VmInstance;
  VM: Class<any>;
  parentId: string | null;
  cancelled: boolean;
};

/**
 * Suspense/lazy remount clears hook state (new useId) while the previous
 * effect cleanup may still be pending. Defer unmount by a microtask and
 * reclaim that instance for the same VM class + parent.
 */
const pendingUnmounts = new Set<PendingUnmount>();
/** Index by vm.id for O(1) cancellation instead of O(n) Set iteration. */
const pendingById = new Map<string, PendingUnmount>();

const cancel = (entry: PendingUnmount) => {
  entry.cancelled = true;
  pendingUnmounts.delete(entry);
  if (entry.vm.id != null) pendingById.delete(entry.vm.id);
};

export const cancelPendingForVm = (id: string | null | undefined) => {
  if (id == null || pendingById.size === 0) return;
  const entry = pendingById.get(id);
  if (entry) cancel(entry);
};

/** Reclaim a single pending VM for this class + parent, or `null`. */
export const claimPendingVm = (
  VM: Class<any>,
  parentId: string | null,
): VmInstance | null => {
  if (pendingUnmounts.size === 0) return null;
  let match: PendingUnmount | null = null;
  for (const entry of pendingUnmounts) {
    if (entry.VM === VM && entry.parentId === parentId) {
      if (match) return null; // more than one — can't disambiguate
      match = entry;
    }
  }
  if (!match) return null;
  cancel(match);
  return match.vm;
};

export const scheduleVmUnmount = (
  vm: VmInstance,
  VM: Class<any>,
  parentId: string | null,
  unmountFn: () => void,
) => {
  const entry: PendingUnmount = { vm, VM, parentId, cancelled: false };
  pendingUnmounts.add(entry);
  if (vm.id != null) pendingById.set(vm.id, entry);
  queueMicrotask(() => {
    if (entry.cancelled) return;
    pendingUnmounts.delete(entry);
    if (vm.id != null) pendingById.delete(vm.id);
    runInAction(unmountFn);
  });
};
