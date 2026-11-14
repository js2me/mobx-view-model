import { ArrowsRotateRight, FileArrowRightOut } from '@gravity-ui/icons';
import { action, createAtom } from 'mobx';
import type { ComponentType } from 'react';
import * as annotation from 'yummies/mobx';
import { applyObservable, type ObservableAnnotationsArray } from 'yummies/mobx';
import type { AnyObject } from 'yummies/types';
import type { DevtoolsInspector } from '../devtools-inspector';
import { isInaccessible } from '../inspection/safe-access';

export type ListItemViewProps<T extends ListItem<any>> = { item: T };

export type ListItemOperation<T> =
  | {
      title: string;
      icon: ComponentType;
      action: VoidFunction;
      active?: boolean;
      persistent?: boolean;
    }
  | ComponentType<ListItemViewProps<ListItem<T>>>;

const annotations: ObservableAnnotationsArray<ListItem<any>> = [
  [
    annotation.computed,
    'isExpanded',
    'depthLine',
    'depth',
    'isInaccessible',
    'stringifiedData',
    'data',
    'isExpandable',
  ],
  [
    annotation.computedStruct,
    'operations',
    'children',
    'expandedChildren',
    'trailingItems',
    'expandedChildrenWithSelf',
  ],
  [annotation.actionBound, 'toggleExpand'],
  [action, 'expand', 'collapse'],
];

export abstract class ListItem<T> {
  position: number = 0;

  metaData: AnyObject = {};

  readonly cache: Map<string, ListItem<any>>;

  protected tempVarName: string = '';

  protected dataWatchAtom = createAtom('');

  get isExpanded() {
    return this.inspector.expansion.get(this.key) === true;
  }

  get children() {
    return this.getChildren?.(this) ?? [];
  }

  get isExpandable() {
    return this.children.length > 0;
  }

  expand() {
    if (this.isExpandable) {
      this.inspector.expansion.set(this.key, true);
    }
  }

  collapse() {
    this.inspector.expansion.set(this.key, false);
  }

  toggleExpand() {
    if (this.isExpanded) {
      this.collapse();
    } else {
      this.expand();
    }
  }

  get expandedChildren(): ListItem<any>[] {
    if (!this.isExpanded) return [];
    const children = this.children.flatMap(
      (child) => child.expandedChildrenWithSelf,
    );
    if (this.closingItem) children.push(this.closingItem);
    return children;
  }

  get trailingItems(): ListItem<any>[] {
    return [];
  }

  get expandedChildrenWithSelf(): ListItem<any>[] {
    const trailing = this.trailingItems.flatMap(
      (item) => item.expandedChildrenWithSelf,
    );

    return [this, ...this.expandedChildren, ...trailing];
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

  get isInaccessible() {
    return isInaccessible(this.data);
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

          this.inspector.notifications.push({
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

  reportDataChanged() {
    this.dataWatchAtom.reportChanged();
  }

  getSavedTempVarNotification(tempVarName: string) {
    return `Saved into ${tempVarName}`;
  }

  constructor(
    public inspector: DevtoolsInspector,
    public key: string,
    private _data: T,
    private getChildren?: (item: ListItem<T>) => ListItem<any>[],
  ) {
    this.cache = inspector.items;
    applyObservable(this, annotations);
  }
}
