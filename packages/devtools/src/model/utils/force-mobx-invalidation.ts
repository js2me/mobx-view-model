import type { MobxAtom } from './mobx-administration';

const DERIVATION_STALE = 2;
const DERIVATION_NOT_TRACKING = 3;

type MobxReactionNode = NonNullable<MobxAtom['observers_']> extends Set<infer T>
  ? T
  : never;

const swappedComputedAtoms = new WeakMap<object, Map<string, MobxAtom>>();

export function rememberSwappedComputedAtom(
  host: object,
  key: string,
  atom: MobxAtom,
) {
  let hostSwaps = swappedComputedAtoms.get(host);

  if (!hostSwaps) {
    hostSwaps = new Map();
    swappedComputedAtoms.set(host, hostSwaps);
  }

  hostSwaps.set(key, atom);
}

export function getSwappedComputedAtom(host: object, key: string) {
  return swappedComputedAtoms.get(host)?.get(key);
}

function runObserverReaction(observer: MobxReactionNode) {
  observer.dependenciesState_ = DERIVATION_STALE;

  if (typeof observer.runReaction_ === 'function') {
    observer.runReaction_();
    return;
  }

  if (typeof observer.schedule_ === 'function') {
    observer.schedule_();
    return;
  }

  observer.onBecomeStale_?.();
}

function scheduleObserverReactions(atom: MobxAtom) {
  for (const observer of atom.observers_ ?? []) {
    runObserverReaction(observer);
  }
}

function forceComputedRefresh(atom: MobxAtom) {
  atom.dependenciesState_ = DERIVATION_NOT_TRACKING;

  if (typeof atom.trackAndCompute === 'function') {
    atom.trackAndCompute();
  } else {
    try {
      atom.get?.();
    } catch {
      // Computed getter may throw while devtools still show edited value.
    }
  }

  scheduleObserverReactions(atom);
}

function forceObservableRefresh(atom: MobxAtom) {
  atom.lowestObserverState_ = 0;
  atom.reportChanged?.();
  scheduleObserverReactions(atom);
}

export function forceMobxAtomInvalidation(atom: MobxAtom | undefined) {
  if (!atom) {
    return;
  }

  if (typeof atom.derivation === 'function') {
    forceComputedRefresh(atom);
    return;
  }

  forceObservableRefresh(atom);

  const visited = new Set<MobxReactionNode>();
  const stack = [...(atom.observers_ ?? [])];

  while (stack.length > 0) {
    const node = stack.pop()!;

    if (visited.has(node)) {
      continue;
    }

    visited.add(node);
    node.onBecomeStale_?.();

    if (node.observers_) {
      for (const child of node.observers_) {
        stack.push(child);
      }
    }
  }
}

export function invalidateMobxPropertyChange(
  host: object,
  key: string,
  currentAtom: MobxAtom | undefined,
) {
  forceMobxAtomInvalidation(getSwappedComputedAtom(host, key));
  forceMobxAtomInvalidation(currentAtom);
}

export function invalidateMobxObjectChange(
  host: object,
  atoms: Iterable<MobxAtom>,
) {
  for (const atom of atoms) {
    forceMobxAtomInvalidation(atom);
  }
}
