import { runInAction } from 'mobx';
import { observer } from 'mobx-react-lite';
import type { ComponentType, ReactNode } from 'react';
import type {
  ListItem,
  ListItemOperation,
  ListItemViewProps,
} from '@/model/list-item/list-item';

export interface PropertyOperationProps {
  item: ListItem<any>;
}

const renderOperationButton = (
  operation: Extract<ListItemOperation<any>, { title: string }>,
) => (
  <button
    key={operation.title}
    type="button"
    title={operation.title}
    data-list-item-operation
    data-active={operation.active ? '' : undefined}
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

export const ListItemOperations = observer(
  ({ item }: PropertyOperationProps) => {
    if (!item.operations.length) {
      return null;
    }

    const persistentOperations: ReactNode[] = [];
    const hoverOperations: ReactNode[] = [];

    item.operations.forEach((operation, i) => {
      if ('title' in operation) {
        const button = renderOperationButton(operation);

        if (operation.persistent) {
          persistentOperations.push(button);
        } else {
          hoverOperations.push(button);
        }

        return;
      }

      const Component = operation as ComponentType<ListItemViewProps<any>>;
      const node = <Component key={`${i}_component`} item={item} />;

      hoverOperations.push(node);
    });

    if (!persistentOperations.length && !hoverOperations.length) {
      return null;
    }

    return (
      <div data-list-item-operations-wrapper>
        {hoverOperations.length > 0 && (
          <div data-list-item-operations data-list-item-operations-collapsible>
            {hoverOperations}
          </div>
        )}
        {persistentOperations.length > 0 && (
          <div data-list-item-operations data-list-item-operations-persistent>
            {persistentOperations}
          </div>
        )}
      </div>
    );
  },
);
