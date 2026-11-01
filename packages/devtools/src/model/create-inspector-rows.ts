import type { DevtoolsInspector } from './devtools-inspector';
import { getAllKeys } from './inspection/get-all-keys';
import { getViewModelBaseKeys } from './inspection/get-view-model-base-keys';
import { sortPropertyKeys } from './inspection/sort-property-keys';
import { InspectorRows } from './inspector-rows';
import { isStickyTreeItem } from './inspector-scroll';
import { ExtraListItem } from './list-item/extra-list-item';
import { PropertyListItem } from './list-item/property-list-item';
import { getViewModelItemKey } from './list-item/vm-list-item';
import { VMPropertiesListItem } from './list-item/vm-properties-list-item';
import { getPropertySearchItems } from './search/filter-items';
import type { SearchContext } from './search/path-matching';
import type { AnyVM } from './types';

export function createInspectorRows(
  inspector: DevtoolsInspector,
): InspectorRows {
  const rows = new InspectorRows();
  const appendItem = (item: import('./list-item/list-item').ListItem<any>) =>
    rows.append(() => item, isStickyTreeItem(item));
  if (inspector.search.isActive) {
    appendSearchRows(inspector, rows);
    return rows;
  }

  const expansion = new Map(inspector.expansion);
  const { tree, settings } = inspector;
  const visited = new Set<AnyVM>();
  const stack = [...tree.roots].reverse();
  while (stack.length) {
    const vm = stack.pop()!;
    if (visited.has(vm)) continue;
    visited.add(vm);
    rows.append(() => inspector.getVmItem(vm), true);
    const expanded =
      expansion.get(getViewModelItemKey(vm)) ?? inspector.autoExpandViewModels;
    if (expanded) appendProperties(inspector, rows, vm, expansion);
    if (expanded || settings.presentationMode === 'list') {
      const children = tree.children.get(vm) ?? [];
      for (let index = children.length - 1; index >= 0; index--)
        stack.push(children[index]);
    }
  }
  if (inspector.extras) {
    const extras = new ExtraListItem(inspector, inspector.extras);
    for (const item of extras.expandedChildrenWithSelf) appendItem(item);
  }
  return rows;
}

function appendProperties(
  inspector: DevtoolsInspector,
  rows: InspectorRows,
  vm: AnyVM,
  expansion: Map<string, boolean>,
  search?: { context: SearchContext; segments: string[] },
) {
  const key = getViewModelItemKey(vm);
  const { settings } = inspector;
  const hiddenKeys = settings.shouldHideBaseProperties(Boolean(search))
    ? getViewModelBaseKeys()
    : null;
  const appendItem = (item: import('./list-item/list-item').ListItem<any>) =>
    rows.append(() => item, isStickyTreeItem(item));

  const grouped = settings.groupViewModelBaseMembers && !search;
  const baseKeys = getViewModelBaseKeys();
  const visibleKeys = getAllKeys(vm).filter((key) => !hiddenKeys?.has(key));
  const keys = sortPropertyKeys(
    visibleKeys.filter((key) => !grouped || !baseKeys.has(key)),
    settings.sortPropertiesBy,
  );
  for (const [order, property] of keys.entries()) {
    const create = () =>
      PropertyListItem.create(
        inspector,
        property,
        property,
        order,
        inspector.getVmItem(vm),
      );
    rows.append(create);
    const propertyKey = `${key}-${property}`;
    const cached = inspector.items.get(`${propertyKey}/list-item`);
    const followsPath =
      search &&
      (search.context.endsWithDot || search.segments.length > 1) &&
      property.toLowerCase() === search.segments[0];
    if (followsPath) {
      for (const item of getPropertySearchItems(
        search.context,
        [create()],
        search.segments,
      ).slice(1))
        appendItem(item);
    } else if (expansion.get(propertyKey)) {
      for (const item of create().expandedChildren) appendItem(item);
    }
    if (!followsPath && cached instanceof PropertyListItem) {
      for (const item of cached.trailingItems.flatMap(
        (item) => item.expandedChildrenWithSelf,
      ))
        appendItem(item);
    }
  }
  if (grouped && visibleKeys.some((key) => baseKeys.has(key))) {
    const create = () => inspector.getVmItem(vm).vmPropertiesItem;
    rows.append(create);
    if (expansion.get(VMPropertiesListItem.createKey(key))) {
      for (const item of create().expandedChildren) appendItem(item);
    }
  }
}

/** Match metadata without constructing every owner's properties. */
function appendSearchRows(inspector: DevtoolsInspector, rows: InspectorRows) {
  const segment = inspector.search.segments[0] ?? '';
  const expansion = new Map(inspector.expansion);
  const stack = [...inspector.tree.roots].reverse();
  while (stack.length) {
    const vm = stack.pop()!;
    const nameMatch =
      vm.constructor.name.toLowerCase().includes(segment) ||
      (vm.id ?? '').toLowerCase().includes(segment);
    const hidden = inspector.settings.shouldHideBaseProperties(true)
      ? getViewModelBaseKeys()
      : null;
    const propertyMatch = getAllKeys(vm).some(
      (key) => !hidden?.has(key) && key.toLowerCase().includes(segment),
    );
    const ownerAllowed =
      !inspector.search.selectedPathOwnerKey ||
      inspector.search.selectedPathSegment !== segment ||
      inspector.search.selectedPathOwnerKey === getViewModelItemKey(vm);
    if (ownerAllowed && (nameMatch || propertyMatch)) {
      rows.append(() => inspector.getVmItem(vm), true);
      const exactProperty =
        inspector.search.isNestedSearch &&
        getAllKeys(vm).some(
          (key) => !hidden?.has(key) && key.toLowerCase() === segment,
        );
      appendProperties(inspector, rows, vm, expansion, {
        context: inspector.search.searchContext,
        segments:
          nameMatch && !exactProperty
            ? inspector.search.segments.slice(1)
            : inspector.search.segments,
      });
    }
    const children = inspector.tree.children.get(vm) ?? [];
    for (let index = children.length - 1; index >= 0; index--)
      stack.push(children[index]);
  }
  if (inspector.extras) {
    const extras = new ExtraListItem(inspector, inspector.extras);
    for (const item of inspector.search.getListItems([extras]))
      rows.append(() => item, isStickyTreeItem(item));
  }
}
