import type {
  AnyViewModel,
  AnyViewModelSimple,
  ViewModelStore,
} from 'mobx-view-model';
import { runInAction } from 'mobx';

type VmInstance = AnyViewModel | AnyViewModelSimple;

// ---------------------------------------------------------------------------
// Unconfirmed-creation tracking — orphan detection via setTimeout
// ---------------------------------------------------------------------------
// mount() runs in the render phase (required for SSR `use(promise)` and to
// avoid a Fallback flash on sync mounts), and the VM is registered in the
// store during render too — so `useViewModel(class/ref/id)` and VM computeds
// that read `this.viewModels.get(...)` during render keep working (children
// and siblings render before the parent's effect).
//
// The cost: a fiber discarded by React 19 (a Suspense boundary creates two
// fibers in one render pass and drops one) has already registered + mounted
// its VM, but its useEffect never commits. That VM is orphaned in the store.
// This Map + setTimeout(0) confirms committed VMs and unmounts the rest.
//
// We cannot use queueMicrotask because React 19 may yield to microtasks
// BETWEEN fibers in the same render pass — a microtask fires too early and
// unmounts the first fiber's VM before the second fiber even starts.
// setTimeout(fn, 0) runs after React has fully committed the render pass.
//
// Reclaim is intentionally removed — Suspense/lazy remounts create a fresh
// VM (state is lost by design). The Map is keyed by VM instance, which gives
// identity-based dedup for free: two fibers that share one instance via
// `viewModels.define` (same explicit id) register the same VM; one
// confirmCreation clears it, the other is a no-op, so the orphan cleanup
// never kills a VM that's still in use.
// ---------------------------------------------------------------------------

export type UnconfirmedCreation = { vm: VmInstance };

const unconfirmed = new Map<VmInstance, ViewModelStore | null>();
let orphanCleanupScheduled = false;

/**
 * Register a VM as "unconfirmed" — its useEffect has not yet committed.
 * Returns an entry for O(1) removal via {@link confirmCreation}.
 *
 * Keyed by VM instance: two fibers sharing one instance (via
 * `viewModels.define` for the same id) collapse to a single entry.
 *
 * Orphan cleanup is NOT scheduled here. It is scheduled from
 * {@link confirmCreation} (called inside useEffect) to guarantee the
 * setTimeout fires AFTER React has flushed effects — scheduling from the
 * render phase would fire it before effects and unmount live VMs.
 */
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
    // All effects have committed. Whoever remains is truly orphaned — its
    // fiber was discarded by React. Remove it from the store and unmount.
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

/**
 * Confirm that a VM's useEffect has committed — the fiber is alive.
 * Removes it from the unconfirmed map, preventing orphan cleanup. Also
 * schedules the cleanup so VMs whose effects never fire get unmounted.
 */
export const confirmCreation = (entry: UnconfirmedCreation): void => {
  unconfirmed.delete(entry.vm);
  if (unconfirmed.size > 0) {
    scheduleOrphanCleanup();
  }
};

/**
 * Immediate unmount + store removal. No grace period, no reclaim — a
 * Suspense/lazy remount creates a fresh VM (state is lost by design).
 */
export const unmountVm = (
  vm: VmInstance,
  store: ViewModelStore | null,
): void => {
  runInAction(() => {
    if (store) store.unmount(vm);
    else vm.unmount?.();
  });
};
