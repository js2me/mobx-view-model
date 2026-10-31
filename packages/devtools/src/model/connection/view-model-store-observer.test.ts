import { afterEach, expect, it, vi } from 'vitest';
import type { AnyVM } from '../types';
import { ViewModelStoreObserver } from './view-model-store-observer';

afterEach(() => vi.useRealTimers());

it('observes manually connected stores only while open, including empty reopening and reparenting', () => {
  vi.useFakeTimers();
  const parent = { id: 'parent' };
  const child = { id: 'child', parentViewModel: null as unknown };
  let vms: unknown[] = [child];
  const opened = new Set<() => void>();
  const closed = new Set<() => void>();
  const host = {
    isPopupOpened: false,
    inspector: { readViewModels: vi.fn(() => vms as AnyVM[]) },
    notifyVmChange: vi.fn(),
    onPopupOpen(listener: () => void) {
      opened.add(listener);
      return () => {
        opened.delete(listener);
      };
    },
    onPopupClose(listener: () => void) {
      closed.add(listener);
      return () => {
        closed.delete(listener);
      };
    },
  };
  const observer = new ViewModelStoreObserver(host);
  vi.advanceTimersByTime(1000);
  expect(host.inspector.readViewModels).not.toHaveBeenCalled();
  for (const listener of opened) listener();
  expect(host.notifyVmChange).toHaveBeenCalledTimes(1);
  vi.advanceTimersByTime(1000);
  expect(host.notifyVmChange).toHaveBeenCalledTimes(1);
  child.parentViewModel = parent;
  vi.advanceTimersByTime(500);
  expect(host.notifyVmChange).toHaveBeenCalledTimes(2);
  for (const listener of closed) listener();
  vms = [];
  vi.advanceTimersByTime(1000);
  expect(host.notifyVmChange).toHaveBeenCalledTimes(2);
  for (const listener of opened) listener();
  expect(host.notifyVmChange).toHaveBeenCalledTimes(3);
  observer.destroy();
  expect(opened.size).toBe(0);
  expect(closed.size).toBe(0);
  const reads = host.inspector.readViewModels.mock.calls.length;
  vi.advanceTimersByTime(1000);
  expect(host.inspector.readViewModels).toHaveBeenCalledTimes(reads);
});
