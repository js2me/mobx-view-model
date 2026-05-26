import { observer } from 'mobx-react-lite';
import type { ComponentType } from 'react';
import type { ListItem, ListItemViewProps } from '@/model/list-item/list-item';
import { runInAction } from 'mobx';

export interface PropertyOperationProps {
  item: ListItem<any>;
}

export const ListItemOperations = observer(
  ({ item }: PropertyOperationProps) => {
    if (!item.operations.length) {
      return null;
    }

    return (
      <div data-list-item-operations>
        {item.operations.map((operation, i) => {
          if ('title' in operation) {
            return (
              <button
                key={operation.title}
                type="button"
                title={operation.title}
                data-list-item-operation
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  runInAction(() => {
                    operation.action();
                  });
                }}
              >
                <operation.icon />
              </button>
            );
          }

          const Component = operation as ComponentType<ListItemViewProps<any>>;

          return <Component key={`${i}_component`} item={item} />;
        })}
      </div>
    );
  },
);
