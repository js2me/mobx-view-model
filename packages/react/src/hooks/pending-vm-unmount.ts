import type {
  AnyViewModel,
  AnyViewModelSimple,
  ViewModelStore,
} from 'mobx-view-model';
import { runInAction } from 'mobx';
import type { Class } from 'yummies/types';

type VmInstance = AnyViewModel | AnyViewModelSimple;

type PendingUnmount = {
  vm: VmInstance;
  VM: Class<any>;
  parentId: string | null;
  cancelled: boolean;
};

const isProd = process.env.NODE_ENV === 'production';
const dbg = !isProd ? (...args: any[]) => console.log('[pendingVM]', ...args) : () => {};

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
  dbg('cancel', entry.vm.id, 'VM=', entry.VM.name, 'parentId=', entry.parentId);
};

export const cancelPendingForVm = (id: string | null | undefined) => {
  if (id == null || pendingById.size === 0) return;
  const entry = pendingById.get(id);
  if (entry) {
    dbg('cancelPendingForVm', id, 'VM=', entry.VM.name);
    cancel(entry);
  } else {
    dbg('cancelPendingForVm NOT FOUND', id, 'pendingById.size=', pendingById.size);
  }
};

/** Reclaim a single pending VM for this class + parent, or `null`. */
export const claimPendingVm = (
  VM: Class<any>,
  parentId: string | null,
): VmInstance | null => {
  dbg('claimPendingVm', VM.name, 'parentId=', parentId, 'pendingUnmounts.size=', pendingUnmounts.size);
  if (pendingUnmounts.size === 0) return null;
  let match: PendingUnmount | null = null;
  for (const entry of pendingUnmounts) {
    if (entry.VM === VM && entry.parentId === parentId) {
      dbg('claimPendingVm candidate', entry.vm.id, 'cancelled=', entry.cancelled);
      if (match) {
        dbg('claimPendingVm AMBIGUOUS - more than one match, returning null');
        return null; // more than one — can't disambiguate
      }
      match = entry;
    }
  }
  if (!match) {
    dbg('claimPendingVm NO MATCH');
    return null;
  }
  cancel(match);
  dbg('claimPendingVm CLAIMED', match.vm.id, 'lifecycleState=', match.vm.lifecycleState, 'isMounted=', match.vm.isMounted);
  return match.vm;
};

export const scheduleVmUnmount = (
  vm: VmInstance,
  VM: Class<any>,
  parentId: string | null,
  store: ViewModelStore | null,
) => {
  dbg('scheduleVmUnmount', vm.id, 'VM=', VM.name, 'parentId=', parentId, 'lifecycleState=', vm.lifecycleState, 'isMounted=', vm.isMounted);
  const entry: PendingUnmount = { vm, VM, parentId, cancelled: false };
  pendingUnmounts.add(entry);
  if (vm.id != null) pendingById.set(vm.id, entry);
  queueMicrotask(() => {
    dbg('scheduleVmUnmount microtask', vm.id, 'cancelled=', entry.cancelled);
    if (entry.cancelled) return;
    pendingUnmounts.delete(entry);
    if (vm.id != null) pendingById.delete(vm.id);
    dbg('scheduleVmUnmount UNMOUNT', vm.id, 'lifecycleState=', vm.lifecycleState);
    runInAction(() => {
      if (store) store.unmount(vm);
      else vm.unmount?.();
    });
  });
};
