import { ExtraListItem } from '../list-item/extra-list-item';
import type { ListItem } from '../list-item/list-item';
import { VMListItem } from '../list-item/vm-list-item';

export const LIST_ITEM_HEIGHT = 22;

export function isStickyTreeItem(
  item: unknown,
): item is VMListItem | ExtraListItem {
  return item instanceof VMListItem || item instanceof ExtraListItem;
}

/** Индекс VM/Extras, чей sticky-header активен при данном scrollTop. */
export function findStickyTreeItemIndex(
  listItems: ListItem<any>[],
  visibleStartIndex: number,
): number {
  const searchFrom = Math.min(visibleStartIndex, listItems.length - 1);

  for (let i = searchFrom; i >= 0; i--) {
    if (isStickyTreeItem(listItems[i])) {
      return i >= visibleStartIndex ? -1 : i;
    }
  }

  return -1;
}

/** Доп. отступ scrollTop, чтобы строка не ушла под sticky VM header. */
export function getStickyHeaderScrollPadding(
  listItems: ListItem<any>[],
  targetIndex: number,
): number {
  if (targetIndex < 0) return 0;

  return findStickyTreeItemIndex(listItems, targetIndex) >= 0
    ? LIST_ITEM_HEIGHT
    : 0;
}
