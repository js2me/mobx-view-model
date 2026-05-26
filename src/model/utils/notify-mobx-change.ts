import { isViewModel } from 'mobx-view-model';
import { getAllKeys } from './get-all-keys';
import { getViewModelBaseKeys } from './get-view-model-base-keys';
import {
  invalidateMobxObject,
  invalidateMobxProperty,
} from './invalidate-view-models-after-edit';
import { findMobxAdministration } from './mobx-administration';

const skippedHierarchyKeys = new Set([
  'viewModels',
  'parentViewModel',
  'vmParams',
  'vmConfig',
  'unmountSignal',
  'abortController',
  'abortSignal',
]);

function isViewModelLike(value: object) {
  return (
    isViewModel(value) ||
    (typeof (value as { payloadChanged?: unknown }).payloadChanged ===
      'function' &&
      typeof (value as { id?: unknown }).id === 'string' &&
      typeof (value as { mount?: unknown }).mount === 'function')
  );
}

export function notifyMobxObjectChange(object: object, key?: string) {
  if (key !== undefined) {
    invalidateMobxProperty(object, key);
    return;
  }

  invalidateMobxObject(object);
}

export function notifyMobxEditPropagation(options: {
  editedHosts: object[];
  relatedViewModels?: object[];
}) {
  const visitedHosts = new WeakSet<object>();

  for (const host of options.editedHosts) {
    if (visitedHosts.has(host)) {
      continue;
    }

    visitedHosts.add(host);
    invalidateMobxObject(host);
  }

  for (const vm of options.relatedViewModels ?? []) {
    invalidateMobxObject(vm);
  }
}

function shouldSkipHierarchyKey(key: string) {
  return skippedHierarchyKeys.has(key) || getViewModelBaseKeys().has(key);
}

function readChildValue(object: object, key: string) {
  if (shouldSkipHierarchyKey(key)) {
    return undefined;
  }

  try {
    return (object as Record<string, unknown>)[key];
  } catch {
    return undefined;
  }
}

export function notifyMobxHierarchy(
  root: object,
  visited = new WeakSet<object>(),
  depth = 0,
) {
  if (visited.has(root) || depth > 24) {
    return;
  }

  visited.add(root);
  notifyMobxObjectChange(root);

  if (isViewModelLike(root)) {
    return;
  }

  if (!findMobxAdministration(root)) {
    return;
  }

  for (const key of getAllKeys(root)) {
    if (shouldSkipHierarchyKey(key)) {
      continue;
    }

    const value = readChildValue(root, key);

    if (value && typeof value === 'object') {
      notifyMobxHierarchy(value, visited, depth + 1);
    }
  }
}

export function notifyMobxPropertyPath(
  root: object,
  path: string[],
  key: string,
) {
  let current: object = root;

  for (const segment of path) {
    const next = readChildValue(current, segment);

    if (!next || typeof next !== 'object') {
      return;
    }

    current = next;
  }

  notifyMobxObjectChange(current, key);

  let ancestor: object = root;

  notifyMobxObjectChange(ancestor);

  for (const segment of path) {
    const next = readChildValue(ancestor, segment);

    if (!next || typeof next !== 'object') {
      break;
    }

    ancestor = next;
    notifyMobxObjectChange(ancestor);
  }
}
