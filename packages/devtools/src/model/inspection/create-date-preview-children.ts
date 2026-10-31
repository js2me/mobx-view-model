import type { DevtoolsInspector } from '../devtools-inspector';
import type { ListItem } from '../list-item/list-item';
import { PropertyListItem } from '../list-item/property-list-item';
import { DATE_PREVIEW_FIELDS, isDateLike } from './date-like';

export const createDatePreviewChildren = (
  inspector: DevtoolsInspector,
  parent: ListItem<any>,
  path: string,
  data: unknown,
): PropertyListItem[] => {
  if (!isDateLike(data)) {
    return [];
  }

  return DATE_PREVIEW_FIELDS.map(({ property, getPreview }, order) =>
    PropertyListItem.create(
      inspector,
      property,
      `${path}.${property}`,
      order,
      parent,
      {
        getPreview: () => {
          const currentData = parent.data;

          if (!isDateLike(currentData)) {
            return undefined;
          }

          return getPreview(currentData);
        },
      },
    ),
  );
};
