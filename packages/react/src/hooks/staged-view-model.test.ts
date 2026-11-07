import { ViewModelStoreBase, type ViewModelCreateConfig, type ViewModelSimple, type ViewModelStore } from 'mobx-view-model';
import { afterEach, expect, test, vi } from 'vitest';
import { commitStagedViewModel, getRenderPhaseViewModel, stageViewModel } from './staged-view-model.js';

class SimpleVM implements ViewModelSimple {
  constructor(public id: string, public renderStore: ViewModelStore) {}
  init = vi.fn();
}

const configFor = (id: string, anchors: unknown[] = []): ViewModelCreateConfig<SimpleVM> => ({
  id,
  VM: SimpleVM,
  payload: {},
  anchors,
  factory: ({ id, viewModels }) => new SimpleVM(id, viewModels!),
});

afterEach(() => {
  vi.runAllTimers();
  vi.useRealTimers();
});

test('render lookups preserve order, anchors and committed instances', () => {
  vi.useFakeTimers();
  const store = new ViewModelStoreBase();
  const anchor = {};
  const committed = store.define(configFor('committed', [anchor]));
  const first = stageViewModel(store, configFor('first', [anchor]), {}) as SimpleVM;
  const last = stageViewModel(store, configFor('last', [anchor]), {}) as SimpleVM;
  const renderStore = first.renderStore;

  for (const lookup of [SimpleVM, anchor]) {
    expect(renderStore.get(lookup)).toBe(last);
    expect(renderStore.has(lookup)).toBe(true);
    expect(renderStore.getIds(lookup)).toEqual(['committed', 'first', 'last']);
    expect(renderStore.getId(lookup)).toBe('last');
    expect(renderStore.getAll(lookup)).toEqual([committed, first, last]);
  }
  expect(store.get(SimpleVM)).toBe(committed);
  expect(renderStore.get('first')).toBe(first);
  expect(renderStore.get('committed')).toBe(committed);
  expect(renderStore.has('missing')).toBe(false);
  expect(renderStore.getAll('missing')).toEqual([]);
  expect(renderStore.constructor).toBe(ViewModelStoreBase);
  expect(renderStore.vmConfig).toBe(store.vmConfig);
});

test('committing shared staged IDs initializes once and does not duplicate lookup IDs', () => {
  vi.useFakeTimers();
  const store = new ViewModelStoreBase();
  const config = configFor('shared');
  const vm = stageViewModel(store, config, {}) as SimpleVM;
  expect(stageViewModel(store, configFor('shared'), {})).toBe(vm);

  commitStagedViewModel(store, config, vm);
  commitStagedViewModel(store, config, vm);
  expect(vm.init).toHaveBeenCalledTimes(1);
  expect(vm.renderStore.getIds(SimpleVM)).toEqual(['shared']);
  expect(vm.renderStore.getAll(SimpleVM)).toEqual([vm]);
});

test('a scheduled sweep preserves VMs staged after its commit epoch', () => {
  vi.useFakeTimers();
  const store = new ViewModelStoreBase();
  stageViewModel(store, configFor('orphan'), {});
  const config = configFor('committed');
  const committed = stageViewModel(store, config, {});
  commitStagedViewModel(store, config, committed);
  const laterConfig = configFor('later');
  const later = stageViewModel(store, laterConfig, {});

  vi.runAllTimers();
  expect(getRenderPhaseViewModel(store, 'orphan')).toBeNull();
  expect(getRenderPhaseViewModel(store, 'later')).toBe(later);
  expect(getRenderPhaseViewModel(store, 'committed')).toBe(committed);
  commitStagedViewModel(store, laterConfig, later);
  expect(store.get('later')).toBe(later);
});
