// @vitest-environment jsdom
import { observable, runInAction } from 'mobx';
import { ViewModelBase, ViewModelStoreBase } from 'mobx-view-model';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DevtoolsInspector } from './devtools-inspector';
import { DevtoolsSettings } from './devtools-settings';
import { PropertyListItem } from './list-item/property-list-item';

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
