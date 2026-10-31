import { runInAction } from 'mobx';
import { isViewModel } from 'mobx-view-model';
import type { AnyVM } from '../types';
import { notifyMobxObjectChange } from './notify-mobx-change';

export type ForceUpdateViewModelResult =
  | { ok: true }
  | { ok: false; error: string };

export function forceUpdateViewModel(vm: AnyVM): ForceUpdateViewModelResult {
  if (!isViewModel(vm)) {
    return {
      ok: false,
      error: 'Force update is only available for ViewModel instances',
    };
  }

  runInAction(() => {
    notifyMobxObjectChange(vm);

    try {
      refreshPayload(vm);
    } catch {
      // App ViewModel may use a separate mobx-view-model bundle.
    }
  });

  return { ok: true };
}

function refreshPayload(vm: AnyVM) {
  if (!('setPayload' in vm) || typeof vm.setPayload !== 'function') {
    return;
  }

  if (!('payload' in vm)) {
    return;
  }

  const payload = (vm as { payload: unknown }).payload;

  if (payload === null || typeof payload !== 'object') {
    return;
  }

  vm.setPayload(
    Array.isArray(payload) ? [...payload] : { ...payload },
  );
}
