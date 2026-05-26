import { reaction, runInAction } from 'mobx';
import type { PropertyListItem } from '../list-item/property-list-item';
import { capturePropertyWatchValue } from './capture-property-watch-value';
import { formatPropertyWatchValue } from './format-property-watch-value';

const MAX_HISTORY_SIZE = 100;

export interface PropertyWatchHistoryEntry {
  id: number;
  timestamp: number;
  value: unknown;
  formattedValue: string;
}

let entryIdCounter = 0;

export class PropertyWatcher {
  private disposeReaction: (() => void) | null = null;

  start(item: PropertyListItem) {
    this.stop();
    this.recordEntry(item);

    this.disposeReaction = reaction(
      () => formatPropertyWatchValue(item.data),
      (serialized, prevSerialized) => {
        if (prevSerialized === undefined) {
          return;
        }

        if (serialized === prevSerialized) {
          return;
        }

        runInAction(() => {
          this.recordEntry(item);
        });
      },
    );
  }

  stop() {
    this.disposeReaction?.();
    this.disposeReaction = null;
  }

  private recordEntry(item: PropertyListItem) {
    const value = capturePropertyWatchValue(item.data);

    const entry: PropertyWatchHistoryEntry = {
      id: ++entryIdCounter,
      timestamp: Date.now(),
      value,
      formattedValue: formatPropertyWatchValue(value),
    };

    item.watchHistory.push(entry);

    if (item.watchHistory.length > MAX_HISTORY_SIZE) {
      item.watchHistory.shift();
    }
  }
}
