import { ArrowsRotateRight, FileArrowRightOut } from '@gravity-ui/icons';
import { action, computed, createAtom, makeObservable } from 'mobx';
import type { ComponentType } from 'react';
import type { AnyObject } from 'yummies/types';
import type { ViewModelDevtools } from '../view-model-devtools';

export type ListItemViewProps<T extends ListItem<any>> = { item: T };

export type ListItemOperation<T> =
  | {
      title: string;
      icon: ComponentType;
      action: VoidFunction;
    }
  | ComponentType<ListItemViewProps<ListItem<T>>>;

export abstract class ListItem<T> {
  position: number = 0;

  metaData: AnyObject = {};

  cache: Map<string, any>;

  protected tempVarName: string = '';

  protected dataWatchAtom = createAtom('');

  get isExpanded() {
    return this.cache.get(this.expandKey) === true;
  }

  get children() {
    return this.getChildren?.(this) ?? [];
  }

  get isExpandable() {
    return this.children.length > 0;
  }

  expand() {
    if (this.isExpandable) {
      this.cache.set(this.expandKey, true);
    }
  }

  collapse() {
    this.cache.set(this.expandKey, false);
  }

  toggleExpand() {
    if (this.isExpanded) {
      this.collapse();
    } else {
      this.expand();
    }
  }

  get expandedChildren(): ListItem<any>[] {
    // При активном поиске не обрабатываем все элементы здесь,
    // это будет сделано в ленивом поиске ViewModelDevtools
    // Здесь возвращаем только развернутые элементы для обычного режима
    if (!this.isExpanded) {
      return [];
    }

    // Защита от рекурсивных структур - используем Set для отслеживания посещенных элементов
    const visited = new Set<ListItem<any>>();
    const result: ListItem<any>[] = [];
    
    // Используем рекурсивный обход в глубину для сохранения правильного порядка
    const traverse = (item: ListItem<any>) => {
      if (visited.has(item)) {
        return;
      }
      
      visited.add(item);
      result.push(item);
      
      // Рекурсивно обрабатываем дочерние элементы, если они развернуты
      if (item.isExpanded) {
        for (const child of item.children) {
          traverse(child);
        }
        if (item.closingItem) {
          result.push(item.closingItem);
        }
      }
    };
    
    // Обрабатываем детей в порядке их появления
    for (const child of this.children) {
      traverse(child);
    }

    return result;
  }

  get expandedChildrenWithSelf(): ListItem<any>[] {
    return [this, ...this.expandedChildren];
  }

  get data() {
    return this._data;
  }

  get closingItem(): ListItem<any> | null {
    return null;
  }

  abstract get depth(): number;

  get depthLine() {
    return String().padEnd(this.depth, '-');
  }

  get stringifiedData() {
    return String(this.data);
  }

  get operations(): ListItemOperation<T>[] {
    return [
      {
        title: 'Save into $temp(N) global variable. $temp1, $temp2, $temp3',
        icon: FileArrowRightOut,
        action: () => {
          if (!this.tempVarName) {
            let counter = 1;

            while (`$temp${counter}` in globalThis) {
              counter++;
            }

            this.tempVarName = `$temp${counter}`;
          }

          Object.assign(globalThis, {
            [this.tempVarName]: this.data,
          });

          this.devtools.notifications.push({
            title: this.getSavedTempVarNotification(this.tempVarName),
          });
        },
      },
      {
        title: 'Refresh value',
        icon: ArrowsRotateRight,
        action: () => this.dataWatchAtom.reportChanged(),
      },
    ];
  }

  getSavedTempVarNotification(tempVarName: string) {
    return `Saved into ${tempVarName}`;
  }

  expandKey;

  constructor(
    public devtools: ViewModelDevtools,
    public key: string,
    private _data: T,
    private getChildren?: (item: ListItem<T>) => ListItem<any>[],
    cache?: Map<string, any>,
  ) {
    this.cache = cache ?? devtools.anyCache;
    this.expandKey = `${key}/expand-key`;
    computed(this, 'isExpanded');
    computed(this, 'totalChildCount');
    computed(this, 'depthLine');
    computed(this, 'depth');
    computed(this, 'stringifiedData');
    computed.struct(this, 'operations');
    computed.struct(this, 'children');
    computed.struct(this, 'expandedChildren');
    computed.struct(this, 'expandedChildrenWithSelf');
    computed(this, 'data');
    computed(this, 'isExpandable');
    action(this, 'expand');
    action(this, 'collapse');
    makeObservable(this);
  }
}
