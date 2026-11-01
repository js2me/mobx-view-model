// @vitest-environment jsdom

import { observable, runInAction } from 'mobx';
import { ViewModelBase, ViewModelStoreBase } from 'mobx-view-model';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDemoStore } from '../../stories/fixtures/create-demo-store';
import { DevtoolsInspector } from './devtools-inspector';
import { DevtoolsSettings } from './devtools-settings';
import { getViewModelBaseKeys } from './inspection/get-view-model-base-keys';
import { PropertyListItem } from './list-item/property-list-item';
import { VMPropertiesListItem } from './list-item/vm-properties-list-item';

let inspector: DevtoolsInspector;
let settings: DevtoolsSettings;
const notifications = { push: vi.fn() };

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  notifications.push.mockClear();
  settings = new DevtoolsSettings({ display: { showInternals: false } });
  inspector = new DevtoolsInspector(settings, notifications);
});
afterEach(() => {
  inspector.destroy();
  settings.destroy();
  vi.useRealTimers();
});

function property(
  key: string,
  parent = inspector.rootItems[0],
): PropertyListItem {
  const item = parent.children.find(
    (item) => item instanceof PropertyListItem && item.property === key,
  );
  if (!(item instanceof PropertyListItem))
    throw new Error(`Missing property ${key}`);
  return item;
}

describe('inspector composition', () => {
  it('reads and edits live object, Map and Set properties through the same tree', () => {
    const data = {
      account: { enabled: false },
      aliases: new Map([['primary', 'old']]),
      permissions: new Set(['read']),
    };
    inspector.setExtras(data);
    const enabled = property('enabled', property('account'));
    enabled.editor.toggleBoolean();
    expect(data.account.enabled).toBe(true);
    const alias = property('0', property('aliases'));
    alias.editor.startEdit();
    alias.editor.editContent = '"new"';
    alias.editor.applyEdit();
    expect(data.aliases.get('primary')).toBe('new');
    const permission = property('0', property('permissions'));
    permission.editor.startEdit();
    permission.editor.editContent = '"write"';
    permission.editor.applyEdit();
    expect([...data.permissions]).toEqual(['write']);
    expect(notifications.push).not.toHaveBeenCalled();
  });

  it('keeps failed edits open and leaves the host value intact', () => {
    const data = { preferences: { theme: 'dark' } };
    inspector.setExtras(data);
    const item = property('preferences');
    item.editor.startEdit();
    item.editor.editContent = '{ invalid json';
    item.editor.applyEdit();
    expect(item.editor.isEditMode).toBe(true);
    expect(data.preferences).toEqual({ theme: 'dark' });
    expect(notifications.push).toHaveBeenCalledOnce();
  });

  it('records snapshots and releases the watcher when the inspector is destroyed', () => {
    const data = observable({ count: 1 });
    inspector.setExtras(data);
    const item = property('count');
    item.watch.toggle();
    runInAction(() => {
      data.count = 2;
    });
    expect(item.watch.history.map((entry) => entry.value)).toEqual([1, 2]);
    expect(inspector.watchedPropertyKeys).toContain(item.key);
    inspector.destroy();
    runInAction(() => {
      data.count = 3;
    });
    expect(item.watch.history.map((entry) => entry.value)).toEqual([1, 2]);
  });

  it('keeps core 11 child ViewModels under their parent', () => {
    class ParentVM extends ViewModelBase {}
    class ChildVM extends ViewModelBase {}
    const store = new ViewModelStoreBase();
    const parent = store.define({ VM: ParentVM, id: 'parent', payload: {} });
    store.define({
      VM: ChildVM,
      id: 'child',
      payload: {},
      parentViewModel: parent,
    });
    inspector.setStore(store);
    expect(inspector.rootItems.map((item) => item.data)).toEqual([parent]);
    expect(
      inspector.rootItems[0].children.some((item) => item.data?.id === 'child'),
    ).toBe(true);
  });

  it('does not reuse a property from a replaced ViewModel with the same class and id', () => {
    class AccountVM extends ViewModelBase {
      label = 'old';
    }
    const first = new ViewModelStoreBase();
    first.define({ VM: AccountVM, id: 'account', payload: {} });
    inspector.setStore(first);
    expect(property('label').data).toBe('old');
    const second = new ViewModelStoreBase();
    const replacement = second.define({
      VM: AccountVM,
      id: 'account',
      payload: {},
    });
    replacement.label = 'new';
    inspector.setStore(second);
    expect(property('label').data).toBe('new');
  });

  it('cancels pending search and watch restoration on disposal', () => {
    vi.useFakeTimers();
    inspector.setExtras({ count: 1 });
    const item = property('count');
    inspector.addWatchedPropertyKey(item.key);
    item.watch.restore();
    inspector.search.handleSearchInput({
      target: { value: 'count' },
    } as React.ChangeEvent<HTMLInputElement>);
    inspector.destroy();
    vi.runAllTimers();
    expect(item.watch.isWatching).toBe(false);
    expect(inspector.search.searchTextToSearch).toBe('');
  });
});

it('stops watchers for disconnected data and restores them against the new source', () => {
  vi.useFakeTimers();
  const previous = observable({ count: 1 });
  inspector.setExtras(previous);
  const previousItem = property('count');
  previousItem.watch.toggle();
  const current = observable({ count: 2 });
  inspector.setExtras(current);
  runInAction(() => {
    previous.count = 99;
  });
  expect(previousItem.watch.history.map((entry) => entry.value)).toEqual([1]);
  const currentItem = property('count');
  vi.runOnlyPendingTimers();
  runInAction(() => {
    current.count = 3;
  });
  expect(currentItem.watch.history.map((entry) => entry.value)).toEqual([2, 3]);
});

it('keeps fully expanded large stores lazy, reuses visible models and prunes removed VMs', () => {
  const demo = createDemoStore(1000);
  inspector.setStore(demo.store);
  inspector.expandAll();
  expect(inspector.rows.length).toBeGreaterThan(10000);
  expect(inspector.items.size).toBe(0);
  const first = inspector.rows.slice(0, 40);
  expect(inspector.items.size).toBeLessThan(40);
  expect(inspector.rows.slice(0, 40)).toEqual(first);
  const vm = demo.instances[0];
  const count = inspector.items.size;
  expect(count).toBeGreaterThan(0);
  demo.store.unmount(vm);
  expect(inspector.items.size).toBeLessThan(count);
  expect(inspector.rows.at(0)?.data).not.toBe(vm);
  demo.store.clean();
});

it('searches far and broad without materializing properties outside the viewport', () => {
  const demo = createDemoStore(1000);
  inspector.setStore(demo.store);
  runInAction(() => {
    inspector.search.searchTextToSearch = 'project-00999';
  });
  expect(inspector.rows.at(0)?.data).toBe(demo.instances[999]);
  expect(inspector.items.size).toBe(0);
  runInAction(() => {
    inspector.search.searchTextToSearch = 'projectviewmodel';
  });
  expect(inspector.rows.length).toBeGreaterThan(10000);
  expect(inspector.items.size).toBe(0);
  inspector.rows.slice(0, 40);
  expect(inspector.items.size).toBeLessThan(40);
  demo.store.clean();
});

for (const query of [
  'project-00003',
  'projectviewmodel',
  'requests',
  'environment.region',
  'project-00003.environment.',
  'metrics.latency',
  'tags.0',
  'project-00003.requests',
]) {
  it(`preserves the existing path-search row order for ${query}`, () => {
    const demo = createDemoStore(4);
    inspector.setStore(demo.store);
    runInAction(() => {
      inspector.search.searchTextToSearch = query;
    });
    const expected = inspector.search
      .getListItems(inspector.rootItems)
      .map((item) => item.key);
    expect(inspector.rows.slice().map((item) => item.key)).toEqual(expected);
    demo.store.clean();
  });
}

it('prunes watch history nodes as well as live properties after a VM is removed', () => {
  const demo = createDemoStore(2);
  inspector.setStore(demo.store);
  const item = property('requests');
  item.watch.toggle();
  inspector.rows.slice();
  expect(inspector.items.size).toBeGreaterThan(0);
  demo.store.unmount(demo.instances[0]);
  expect(
    [...inspector.items.values()].some((cached) =>
      cached.key.startsWith(item.key),
    ),
  ).toBe(false);
  demo.store.clean();
});

it('refreshes cached parent/depth when an isolated host reports a reparenting', () => {
  const first = { id: 'first', parentViewModel: null };
  const second = { id: 'second', parentViewModel: null as unknown };
  const store = {
    viewModels: new Map([
      ['first', first],
      ['second', second],
    ]),
  };
  inspector.setStore(store as unknown as ViewModelStoreBase);
  const item = inspector.getVmItem(second);
  expect(item.depth).toBe(0);
  second.parentViewModel = first;
  inspector.notifyVmChange();
  expect(inspector.getVmItem(second)).toBe(item);
  expect(item.parent?.data).toBe(first);
  expect(item.depth).toBe(1);
  expect(inspector.tree.roots).toEqual([first]);
});

it('drops expansion state for removed VMs that were never materialized', () => {
  const demo = createDemoStore(1000);
  inspector.setStore(demo.store);
  inspector.expandAll();
  expect(inspector.expansion.size).toBe(1000);
  demo.store.unmount(demo.instances[999]);
  expect(inspector.expansion.size).toBe(999);
  demo.store.clean();
});

it('rejects lookup-only stores before replacing the current source or disposing its watchers', () => {
  const demo = createDemoStore(1);
  inspector.setStore(demo.store);
  const watched = property('requests');
  watched.watch.toggle();
  const cachedItems = inspector.items.size;
  const lookupOnly = { getIds: () => [], get: () => undefined };
  expect(() => inspector.setStore(lookupOnly)).toThrow(/viewModels/);
  expect(inspector.store).toBe(demo.store);
  expect(inspector.items.size).toBe(cachedItems);
  runInAction(() => demo.instances[0].increment());
  expect(watched.watch.history.map((entry) => entry.value)).toEqual([0, 1]);
  demo.store.clean();
});

it('rejects invalid runtime enumeration shapes instead of treating them as an empty store', () => {
  for (const viewModels of [
    {},
    { values: 42 },
    { values: () => null },
    { values: () => ({}) },
  ]) {
    const store = { getIds: () => [], get: () => undefined, viewModels };
    expect(() => inspector.setStore(store)).toThrow(/viewModels/);
    expect(inspector.store).toBeUndefined();
  }
});

describe('grouped ViewModelBase properties', () => {
  function setup() {
    class GroupedVM extends ViewModelBase {
      count = 1;
      account = { name: 'Ada' };
    }
    const store = new ViewModelStoreBase();
    const vm = store.define({
      VM: GroupedVM,
      id: 'grouped',
      payload: { value: 1 },
    });
    inspector.setStore(store);
    settings.setGroupViewModelBaseMembers(true);
    inspector.expandAll();
    return { store, vm };
  }

  it('keeps base members lazy in one collapsed group, even with internals hidden', () => {
    const { store, vm } = setup();
    expect(inspector.rows.length).toBe(4);
    expect(inspector.items.size).toBe(0);
    const rows = inspector.rows.slice();
    const group = rows[3];
    expect(group).toBeInstanceOf(VMPropertiesListItem);
    expect(group.isExpanded).toBe(false);
    expect(property('count').data).toBe(1);
    expect(inspector.rootItems[0].children).toEqual([rows[1], rows[2], group]);
    group.expand();
    expect(group.children.map((item) => item.property)).toEqual(
      inspector
        .getVmItem(vm)
        .propertyKeys.filter((key) => getViewModelBaseKeys().has(key)),
    );
    expect(inspector.rows.slice().map((item) => item.key)).toEqual(
      inspector.rootItems
        .flatMap((item) => item.expandedChildrenWithSelf)
        .map((item) => item.key),
    );
    const payload = property('payload', group);
    expect(payload.depth).toBe(group.depth + 1);
    expect(payload.parentListItem).toBe(inspector.rootItems[0]);
    store.clean();
  });

  it('preserves paths, cached property models and edits when toggling grouping', () => {
    const { store, vm } = setup();
    const group = inspector.getVmItem(vm).vmPropertiesItem;
    const payload = property('payload', group);
    const value = property('value', payload);
    value.editor.startEdit();
    value.editor.editContent = '2';
    value.editor.applyEdit();
    expect(vm.payload.value).toBe(2);
    settings.setShowInternals(true);
    settings.setGroupViewModelBaseMembers(false);
    expect(property('payload')).toBe(payload);
    expect(payload.depth).toBe(1);
    expect(property('value', payload)).toBe(value);
    store.clean();
  });

  it('excludes base properties from search and suggestions, including nested paths', () => {
    const { store, vm } = setup();
    for (const query of [
      'payload',
      'payload.value',
      'grouped.payload.',
      'viewModels',
    ]) {
      runInAction(() => {
        inspector.search.searchText = query;
        inspector.search.searchTextToSearch = query;
      });
      const rows = inspector.rows.slice();
      expect(
        rows.some(
          (item) =>
            item instanceof PropertyListItem &&
            getViewModelBaseKeys().has(item.property ?? ''),
        ),
      ).toBe(false);
      expect(rows.some((item) => item instanceof VMPropertiesListItem)).toBe(
        false,
      );
      expect(inspector.search.suggestionItems).toEqual([]);
    }
    for (const query of [
      'count',
      'account.name',
      'grouped.account.',
      'grouped',
    ]) {
      runInAction(() => {
        inspector.search.searchTextToSearch = query;
      });
      expect(inspector.rows.slice().map((item) => item.key)).toEqual(
        inspector.search
          .getListItems(inspector.rootItems)
          .map((item) => item.key),
      );
      expect(inspector.rows.length).toBeGreaterThan(1);
    }
    inspector.search.resetSearch();
    expect(inspector.rows.at(3)).toBe(inspector.getVmItem(vm).vmPropertiesItem);
    expect(inspector.rows.at(3)?.isExpanded).toBe(false);
    store.clean();
  });

  it('persists grouping preferences over configuration defaults', () => {
    settings.destroy();
    localStorage.clear();
    const initial = new DevtoolsSettings({
      display: { groupViewModelBaseMembers: true },
    });
    expect(initial.groupViewModelBaseMembers).toBe(true);
    initial.setGroupViewModelBaseMembers(false);
    initial.destroy();
    const restored = new DevtoolsSettings({
      display: { groupViewModelBaseMembers: true },
    });
    expect(restored.groupViewModelBaseMembers).toBe(false);
    restored.destroy();
  });
});
