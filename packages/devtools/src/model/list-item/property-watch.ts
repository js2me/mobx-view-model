import { action, makeObservable, observable, reaction } from 'mobx';
import type { PropertyListItem } from './property-list-item';
import { capturePropertyWatchValue } from './watch/capture-property-watch-value';
import { formatPropertyWatchValue } from './watch/format-property-watch-value';

export interface PropertyWatchHistoryEntry {
  id: number;
  timestamp: number;
  value: unknown;
  formattedValue: string;
}
const HISTORY_LIMIT = 100;
let entryId = 0;

export class PropertyWatch {
  isWatching = false;
  readonly history: PropertyWatchHistoryEntry[] = [];
  private dispose?: () => void;
  private restoreTimer?: ReturnType<typeof setTimeout>;

  constructor(private readonly item: PropertyListItem) {
    makeObservable<this, 'record'>(this, {
      isWatching: observable.ref,
      history: observable.shallow,
      toggle: action.bound,
      clear: action.bound,
      record: action.bound,
    });
  }
  restore() {
    if (this.item.inspector.watchedPropertyKeys.includes(this.item.key))
      this.restoreTimer = setTimeout(() => {
        this.restoreTimer = undefined;
        if (!this.isWatching) this.toggle();
      }, 0);
  }
  toggle() {
    this.isWatching = !this.isWatching;
    this.item.inspector.notifyLayoutChange();
    if (this.isWatching) {
      this.item.inspector.addWatchedPropertyKey(this.item.key);
      this.record();
      this.dispose = reaction(
        () => formatPropertyWatchValue(this.item.data),
        this.record,
      );
    } else {
      this.item.inspector.removeWatchedPropertyKey(this.item.key);
      this.dispose?.();
      this.dispose = undefined;
    }
  }
  clear() {
    this.history.length = 0;
    this.item.inspector.notifyLayoutChange();
  }
  private record() {
    const value = capturePropertyWatchValue(this.item.data);
    this.item.inspector.notifyLayoutChange();
    this.history.push({
      id: ++entryId,
      timestamp: Date.now(),
      value,
      formattedValue: formatPropertyWatchValue(value),
    });
    if (this.history.length > HISTORY_LIMIT) this.history.shift();
  }
  destroy() {
    clearTimeout(this.restoreTimer);
    this.dispose?.();
  }
}
