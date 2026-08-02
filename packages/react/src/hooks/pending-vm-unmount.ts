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

// ---------------------------------------------------------------------------
// Unconfirmed-creation tracking — orphan detection via setTimeout
// ---------------------------------------------------------------------------
// When React 19 creates two fibers for the same component in one render pass
// (Suspense boundary catches a child's suspend), both fibers go through
// useCreateViewModel and create separate VM instances. The first fiber is
// discarded — its useEffect cleanup never runs — so the first VM is orphaned
// in the store forever.
//
// We cannot use queueMicrotask because React 19 may yield to microtasks
// BETWEEN fibers in the same render pass. A microtask fires too early and
// kills the first fiber's VM before the second fiber even starts.
//
// Using setTimeout(fn, 0) ensures the cleanup runs after React has fully
// committed the current render pass (including all microtasks and effects).
// By that point, every surviving fiber's effect has called confirmCreation().
// Whoever remains in unconfirmedCreations is truly orphaned.
// ---------------------------------------------------------------------------

export type UnconfirmedCreation = {
  vm: VmInstance;
  VM: Class<any>;
  parentId: string | null;
  store: ViewModelStore | null;
};

/**
 * Map keyed by VM instance to deduplicate registrations.
 * When two fibers create the same VM (viewModels.define returns the existing
 * instance for the same id), both fibers would register the same VM as
 * unconfirmed. Without dedup, the orphan cleanup would kill a VM that's still
 * in use: one fiber's confirmCreation removes its entry, but the other fiber's
 * entry (for the SAME instance) remains → setTimeout cleanup unmounts it.
 */
const unconfirmedByVm = new Map<VmInstance, UnconfirmedCreation>();
let orphanCleanupScheduled = false;

/**
 * Register a VM as "unconfirmed" — its useEffect has not yet committed.
 * Returns the entry for O(1) removal via confirmCreation().
 *
 * If the same VM instance is already registered (e.g. two fibers hit
 * viewModels.define with the same id and get the same instance back),
 * returns the existing entry — no duplicate registration.
 *
 * NOTE: orphan cleanup is NOT scheduled here. It is scheduled from
 * confirmCreation() (called inside useEffect) to guarantee that
 * setTimeout(0) fires AFTER React has flushed effects. Scheduling
 * from the render phase would cause the cleanup to fire before effects,
 * killing VMs that are still alive.
 */
export const registerUnconfirmedCreation = (
  vm: VmInstance,
  VM: Class<any>,
  parentId: string | null,
  store: ViewModelStore | null,
): UnconfirmedCreation => {
  // Dedup: same VM instance → same entry. Two fibers may share one VM
  // (viewModels.define returns the existing instance for the same id).
  // Without this, the orphan cleanup would kill a VM that's still alive.
  const existing = unconfirmedByVm.get(vm);
  if (existing) {
    dbg('registerUnconfirmed DEDUP', vm.id, 'VM=', VM.name, 'unconfirmedByVm.size=', unconfirmedByVm.size);
    return existing;
  }

  const entry: UnconfirmedCreation = { vm, VM, parentId, store };
  unconfirmedByVm.set(vm, entry);
  dbg('registerUnconfirmed', vm.id, 'VM=', VM.name, 'unconfirmedByVm.size=', unconfirmedByVm.size);

  return entry;
};

/**
 * Schedule the orphan cleanup. Called from confirmCreation() (inside useEffect)
 * to guarantee that the setTimeout fires AFTER React has flushed all effects.
 * If we scheduled from the render phase, setTimeout(0) would fire before
 * effects because it was enqueued before React's MessageChannel flush.
 */
const scheduleOrphanCleanup = () => {
  if (orphanCleanupScheduled) return;
  orphanCleanupScheduled = true;
  setTimeout(() => {
    orphanCleanupScheduled = false;
    // All effects have committed. Whoever remains is orphaned.
    if (unconfirmedByVm.size === 0) return;
    for (const e of unconfirmedByVm.values()) {
      unconfirmedByVm.delete(e.vm);
      dbg('ORPHAN CLEANUP', e.vm.id, 'VM=', e.VM.name);
      // Defensive: no pending unmount should exist for orphans, but
      // cancel just in case future code changes create a path for one.
      cancelPendingForVm(e.vm.id);
      runInAction(() => {
        if (e.store) e.store.unmount(e.vm);
        else e.vm.unmount?.();
      });
    }
  });
};

/**
 * Confirm that a VM's useEffect has committed — the fiber is alive.
 * Removes the entry from the unconfirmed map, preventing orphan cleanup.
 * Also schedules the orphan cleanup so that any VMs whose effects never
 * fire (discarded fibers) are cleaned up after all effects have run.
 */
export const confirmCreation = (entry: UnconfirmedCreation): void => {
  const deleted = unconfirmedByVm.delete(entry.vm);
  if (deleted) {
    dbg('confirmCreation', entry.vm.id, 'VM=', entry.VM.name);
  }
  // Schedule cleanup from inside useEffect — this guarantees the
  // setTimeout fires AFTER React has flushed effects, not before.
  if (unconfirmedByVm.size > 0) {
    scheduleOrphanCleanup();
  }
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
