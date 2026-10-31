import { vi } from 'vitest';
import { PropertyListItem } from '../../list-item/property-list-item';
import type { PropertyEditorHost } from '../../list-item/property-editor';
import type { ViewModelDevtools } from '../../view-model-devtools';

export type MockPropertyListItem = {
  property?: string;
  data: unknown;
  parentListItem: MockPropertyListItem | { data: unknown };
};

export function createPropertyListItemChain(
  segments: Array<{ property: string; host: object }>,
): MockPropertyListItem {
  const [first] = segments;

  if (!first) {
    throw new Error('segments must not be empty');
  }

  let current: MockPropertyListItem | { data: object } = { data: first.host };

  for (const segment of segments) {
    current = {
      property: segment.property,
      data: Reflect.get(segment.host, segment.property),
      parentListItem: current,
    };
  }

  return current as MockPropertyListItem;
}

export function asPropertyListItemChain(
  leaf: MockPropertyListItem,
): PropertyListItem {
  const items: MockPropertyListItem[] = [];
  let current: MockPropertyListItem | { data: object } = leaf;

  while ('property' in current && current.property != null) {
    items.push(current);
    current = current.parentListItem as MockPropertyListItem;
  }

  for (const item of items) {
    Object.setPrototypeOf(item, PropertyListItem.prototype);
  }

  return leaf as PropertyListItem;
}

export type DevtoolsTestStub = {
  notifications: {
    push: (notification: { title: string }) => void;
  };
  allVms: object[];
};

export function createPropertyEditorHost(options: {
  item: MockPropertyListItem | PropertyListItem;
  devtools: DevtoolsTestStub;
  dataType?: string;
  type?: string;
}): PropertyEditorHost {
  const { item, devtools } = options;
  const readItem = item as MockPropertyListItem;

  return {
    property: readItem.property,
    type: options.type ?? 'primitive',
    get dataType() {
      return options.dataType ?? typeof this.data;
    },
    get data() {
      if (readItem.property == null) {
        return readItem.data;
      }

      return Reflect.get(
        (readItem.parentListItem as { data: object }).data,
        readItem.property,
      );
    },
    isInaccessible: false,
    nestedValueType: 'primitive',
    collectionEntryKind: undefined,
    collectionEntryIndex: undefined,
    getPreview: undefined,
    mapEntryKey: undefined,
    stringifiedData: String(readItem.data),
    parentListItem: readItem.parentListItem,
    devtools: devtools as unknown as ViewModelDevtools,
    reportDataChanged() {},
  };
}

export function createDevtoolsStub(): DevtoolsTestStub {
  return {
    notifications: {
      push: vi.fn(),
    },
    allVms: [] as object[],
  };
}
