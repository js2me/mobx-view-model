// @vitest-environment jsdom

import { runInAction } from 'mobx';
import { ViewModelBase, ViewModelStoreBase } from 'mobx-view-model';
import { ViewModelBase as Core8 } from 'mobx-view-model-v8';
import { ViewModelBase as Core8Initial } from 'mobx-view-model-v8-initial';
import { ViewModelBase as Core9 } from 'mobx-view-model-v9';
import { ViewModelBase as Core10 } from 'mobx-view-model-v10';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DevtoolsInspector } from '../devtools-inspector';
import { DevtoolsSettings } from '../devtools-settings';
import { PropertyListItem } from '../list-item/property-list-item';
import { VMPropertiesListItem } from '../list-item/vm-properties-list-item';
import { getAllKeys } from './get-all-keys';

const disposers: Array<() => void> = [];
afterEach(() => {
  for (const dispose of disposers.splice(0).reverse()) dispose();
  localStorage.clear();
  sessionStorage.clear();
});

const versions = [
  ['8.0', Core8Initial],
  ['8.10', Core8],
  ['9', Core9],
  ['10', Core10],
  ['11', ViewModelBase],
] as const;

describe.each(versions)(
  'VM properties grouping with core %s',
  (_version, LegacyBase) => {
    it('groups every real base member while keeping application properties visible', () => {
      const Base = LegacyBase as unknown as typeof ViewModelBase;
      const config = {
        id: 'legacy',
        payload: {},
        viewModels: { get: () => null, has: () => false } as never,
      };
      const baseline = new Base(config);
      class ApplicationVM extends Base {
        selectedGroup = 'business';
        product = { id: 10082 };
      }
      const vm = new ApplicationVM(config);
      const settings = new DevtoolsSettings({});
      const inspector = new DevtoolsInspector(settings, { push: vi.fn() });
      disposers.push(
        () => settings.destroy(),
        () => inspector.destroy(),
      );
      const owner = inspector.getVmItem(vm);
      const group = owner.children.find(
        (item) => item instanceof VMPropertiesListItem,
      );
      expect(group).toBeInstanceOf(VMPropertiesListItem);
      const business = owner.children
        .filter((item) => item instanceof PropertyListItem)
        .map((item) => item.property);
      expect(business).toEqual(['selectedGroup', 'product']);
      expect(
        group!.children.map((item) => (item as PropertyListItem).property),
      ).toEqual(expect.arrayContaining(getAllKeys(baseline)));
      settings.setGroupViewModelBaseMembers(false);
      settings.setShowInternals(false);
      expect(
        owner.children
          .filter((item) => item instanceof PropertyListItem)
          .map((item) => item.property),
      ).toEqual(['selectedGroup', 'product']);
    });
  },
);

it('keeps core 11 application fields whose names were only reserved in legacy cores', () => {
  class Model extends ViewModelBase {
    vmParams = 'application params';
    vmConfig = 'application config';
    payloadChanged = 'application field';
  }
  const store = new ViewModelStoreBase();
  const vm = store.define({ VM: Model, id: 'modern', payload: {} });
  disposers.push(() => store.clean());
  const settings = new DevtoolsSettings({});
  const inspector = new DevtoolsInspector(settings, { push: vi.fn() });
  disposers.push(
    () => settings.destroy(),
    () => inspector.destroy(),
  );
  inspector.setStore(store);
  const owner = inspector.getVmItem(vm);
  expect(
    owner.children
      .filter((item) => item instanceof PropertyListItem)
      .map((item) => item.property),
  ).toEqual(['vmParams', 'vmConfig', 'payloadChanged']);
  settings.setGroupViewModelBaseMembers(false);
  settings.setShowInternals(false);
  expect(
    inspector.rows
      .slice()
      .filter((item) => item instanceof PropertyListItem)
      .map((item) => item.property),
  ).toEqual(['vmParams', 'vmConfig', 'payloadChanged']);
  runInAction(() => {
    inspector.search.searchText = 'vmConfig';
    inspector.search.searchTextToSearch = 'vmConfig';
  });
  expect(inspector.search.suggestionItems.map((item) => item.value)).toContain(
    'vmConfig',
  );
  expect(
    inspector.rows
      .slice()
      .some(
        (item) =>
          item instanceof PropertyListItem && item.property === 'vmConfig',
      ),
  ).toBe(true);
});
