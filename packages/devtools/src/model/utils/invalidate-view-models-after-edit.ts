import {
  findMobxAdministration,
  getMobxComputedPropertyKeys,
  objectsReferentiallyEqual,
  type MobxAtom,
} from './mobx-administration';
import {
  forceMobxAtomInvalidation,
  getSwappedComputedAtom,
} from './force-mobx-invalidation';

function isComputedAtom(atom: MobxAtom | undefined): atom is MobxAtom {
  return !!atom && typeof atom.derivation === 'function';
}

function invalidateMobxAtom(atom: MobxAtom | undefined, host: object, key: string) {
  const swappedAtom = getSwappedComputedAtom(host, key);

  if (swappedAtom && atom && !isComputedAtom(atom)) {
    // Computed was pinned to an observable during edit; refreshing the old
    // computed derivation would restore the pre-edit value.
    forceMobxAtomInvalidation(atom);
    return;
  }

  forceMobxAtomInvalidation(swappedAtom);
  forceMobxAtomInvalidation(atom);
}

export function invalidateMobxProperty(host: object, key: string) {
  const adm = findMobxAdministration(host);

  if (!adm) {
    return;
  }

  invalidateMobxAtom(adm.values_.get(key), host, key);
  adm.keysAtom_?.reportChanged?.();
}

export function invalidateMobxObject(host: object) {
  const adm = findMobxAdministration(host);

  if (!adm) {
    return;
  }

  for (const [key, atom] of adm.values_) {
    invalidateMobxAtom(atom, host, key);
  }

  adm.keysAtom_?.reportChanged?.();
}

export function invalidateMobxComputedProperties(host: object) {
  for (const key of getMobxComputedPropertyKeys(host)) {
    invalidateMobxProperty(host, key);
  }
}

export function invalidateMobxPropertyPath(root: object, path: string[]) {
  let current = root;

  for (const segment of path) {
    invalidateMobxProperty(current, segment);

    const next = readPropertyValue(current, segment);

    if (!next || typeof next !== 'object') {
      return;
    }

    current = next;
  }
}

export function refreshMobxComputedProperties(host: object) {
  for (const key of getMobxComputedPropertyKeys(host)) {
    const adm = findMobxAdministration(host);
    forceMobxAtomInvalidation(adm?.values_.get(key));
  }
}

function readPropertyValue(object: object, key: string) {
  try {
    return (object as Record<string, unknown>)[key];
  } catch {
    return undefined;
  }
}

function viewModelReferencesTarget(
  value: unknown,
  target: object,
  visited: WeakSet<object>,
  depth: number,
): boolean {
  if (depth > 10 || value == null || typeof value !== 'object') {
    return false;
  }

  if (objectsReferentiallyEqual(value, target)) {
    return true;
  }

  if (visited.has(value)) {
    return false;
  }

  visited.add(value);

  const adm = findMobxAdministration(value);

  if (!adm) {
    return false;
  }

  for (const key of adm.values_.keys()) {
    try {
      const next = readPropertyValue(value, key);

      if (viewModelReferencesTarget(next, target, visited, depth + 1)) {
        return true;
      }
    } catch {
      // Skip inaccessible observable fields.
    }
  }

  return false;
}

export function findViewModelsReferencingObject(
  viewModels: object[],
  target: object,
): object[] {
  return viewModels.filter((vm) => {
    const visited = new WeakSet<object>();
    return viewModelReferencesTarget(vm, target, visited, 0);
  });
}

export function invalidateViewModelsAfterEdit(options: {
  editedHost: object;
  editedPropertyKey?: string;
  pathFromAncestorVm: string[];
  viewModels: object[];
}) {
  const editedPropertyKey =
    options.editedPropertyKey ?? options.pathFromAncestorVm.at(-1);

  if (editedPropertyKey) {
    invalidateMobxProperty(options.editedHost, editedPropertyKey);
  }

  const relatedViewModels = findViewModelsReferencingObject(
    options.viewModels,
    options.editedHost,
  );

  for (const vm of relatedViewModels) {
    invalidateMobxPropertyPath(vm, options.pathFromAncestorVm);
    refreshMobxComputedProperties(vm);
  }

  return relatedViewModels;
}
