import type { ListItem } from './list-item/list-item';

/** A row is cheap metadata until it enters the viewport. */
export class InspectorRows {
  private readonly factories: Array<() => ListItem<any>> = [];
  private readonly groupIndices: number[] = [];

  get length() {
    return this.factories.length;
  }
  append(create: () => ListItem<any>, isGroup = false) {
    if (isGroup) this.groupIndices.push(this.length);
    this.factories.push(create);
  }
  at(index: number) {
    return this.factories[index]?.();
  }
  slice(start = 0, end = this.length): ListItem<any>[] {
    const items: ListItem<any>[] = [];
    for (
      let index = Math.max(0, start);
      index < Math.min(this.length, end);
      index++
    ) {
      const item = this.at(index);
      if (item) items.push(item);
    }
    return items;
  }
  findStickyIndex(visibleStart: number) {
    const target = Math.min(visibleStart, this.length - 1);
    let left = 0;
    let right = this.groupIndices.length;
    while (left < right) {
      const middle = (left + right) >>> 1;
      if (this.groupIndices[middle] <= target) left = middle + 1;
      else right = middle;
    }
    const index = this.groupIndices[left - 1] ?? -1;
    return index < visibleStart ? index : -1;
  }
}
