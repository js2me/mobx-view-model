import type {
  AnyViewModel,
  AnyViewModelSimple,
  ViewModelStore,
} from 'mobx-view-model';
import { _internals } from 'mobx-view-model';
import { runInAction } from 'mobx';
import type { Class } from 'yummies/types';

const { isShallowEqual } = _internals;

type VmInstance = AnyViewModel | AnyViewModelSimple;

type PendingUnmount = {
  vm: VmInstance;
  VM: Class<any>;
  parentId: string | null;
  store: ViewModelStore | null;
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

/**
 * The claim key (VM class + parentId + store) is shared by same-class siblings
 * rendered under one parent (e.g. a list of avatars). Payload is the
 * discriminator: a remount of the SAME component carries an equal payload,
 * while a sibling generally doesn't. VMs that don't expose `payload`
 * (some ViewModelSimple impls) can't be discriminated — for them the
 * ambiguity guard below is the only protection.
 */
const payloadMatches = (vm: VmInstance, payload: unknown): boolean => {
  const vmPayload = (vm as { payload?: unknown }).payload;
  if (vmPayload === payload) return true;
  if (vmPayload == null || payload == null) return true;
  return isShallowEqual(vmPayload, payload);
};

/** Reclaim a single pending VM for this class + parent + store + payload, or `null`. */
export const claimPendingVm = (
  VM: Class<any>,
  parentId: string | null,
  store: ViewModelStore | null,
  payload: unknown,
): VmInstance | null => {
  dbg('claimPendingVm', VM.name, 'parentId=', parentId, 'store=', store, 'pendingUnmounts.size=', pendingUnmounts.size);
  if (pendingUnmounts.size === 0) return null;
  let match: PendingUnmount | null = null;
  for (const entry of pendingUnmounts) {
    if (
      entry.VM === VM &&
      entry.parentId === parentId &&
      entry.store === store &&
      payloadMatches(entry.vm, payload)
    ) {
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
  dbg('claimPendingVm CLAIMED', match.vm.id, 'lifecycleState=', (match.vm as any).lifecycleState, 'isMounted=', (match.vm as any).isMounted);
  return match.vm;
};

/** Reclaim a pending VM by its explicit id + class + store, or `null`. */
export const claimPendingVmById = (
  id: string,
  VM: Class<any>,
  store: ViewModelStore | null,
): VmInstance | null => {
  if (pendingById.size === 0) return null;
  const entry = pendingById.get(id);
  if (entry && !entry.cancelled && entry.VM === VM && entry.store === store) {
    dbg('claimPendingVmById CLAIMED', entry.vm.id, 'lifecycleState=', (entry.vm as any).lifecycleState, 'isMounted=', (entry.vm as any).isMounted);
    cancel(entry);
    return entry.vm;
  }
  dbg('claimPendingVmById NO MATCH', id);
  return null;
};

export const scheduleVmUnmount = (
  vm: VmInstance,
  VM: Class<any>,
  parentId: string | null,
  store: ViewModelStore | null,
) => {
  dbg('scheduleVmUnmount', vm.id, 'VM=', VM.name, 'parentId=', parentId, 'lifecycleState=', (vm as any).lifecycleState, 'isMounted=', (vm as any).isMounted);
  const entry: PendingUnmount = { vm, VM, parentId, store, cancelled: false };
  pendingUnmounts.add(entry);
  if (vm.id != null) {
    const existing = pendingById.get(vm.id);
    if (existing) cancel(existing);
    pendingById.set(vm.id, entry);
  }
  queueMicrotask(() => {
    dbg('scheduleVmUnmount microtask', vm.id, 'cancelled=', entry.cancelled);
    if (entry.cancelled) return;
    pendingUnmounts.delete(entry);
    if (vm.id != null) pendingById.delete(vm.id);
    dbg('scheduleVmUnmount UNMOUNT', vm.id, 'lifecycleState=', (vm as any).lifecycleState);
    runInAction(() => {
      if (store) store.unmount(vm);
      else vm.unmount?.();
    });
  });
};
