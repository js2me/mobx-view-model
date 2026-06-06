import type { ListItem } from '../list-item/list-item';
import { PropertyListItem } from '../list-item/property-list-item';
import type { ViewModelDevtools } from '../view-model-devtools';
import { DATE_PREVIEW_FIELDS, isDateLike } from './date-like';

export const createDatePreviewChildren = (
  devtools: ViewModelDevtools,
  parent: ListItem<any>,
  path: string,
  data: unknown,
): PropertyListItem[] => {
  if (!isDateLike(data)) {
    return [];
  }

  return DATE_PREVIEW_FIELDS.map(({ property, getPreview }, order) =>
    PropertyListItem.create(
      devtools,
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
