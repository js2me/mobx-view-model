// @vitest-environment jsdom
import { act } from '@testing-library/react';
import { autorun, observable, runInAction } from 'mobx';
import { expect, it, vi } from 'vitest';
import { prepareObjectInlinePreview } from '../../src/model/inspection/format-object-inline-preview';
import { INLINE_PREVIEW_MAX_ITEMS } from '../../src/model/inspection/inline-preview';
import { PropertyListItem } from '../../src/model/list-item/property-list-item';
import { inspect } from './inspect';

it('indexes Map rows once and does not rescan keys for a value-only update', () => {
  const entries = observable.map(
    Array.from({ length: 1000 }, (_, index) => [index, index] as const),
  );
  const ui = inspect({ entries }, ['entries', '0'], () => null);
  const rows = ui.item.parentListItem.children.filter(
    (row): row is PropertyListItem =>
      row instanceof PropertyListItem && row.collectionEntryKind === 'map',
  );
  let visited = 0;
  const originalEntries = entries.entries.bind(entries);
  const originalKeys = entries.keys.bind(entries);
  const entriesSpy = vi
    .spyOn(entries, 'entries')
    .mockImplementation(function* () {
      for (const entry of originalEntries()) {
        visited++;
        yield entry;
      }
      return undefined;
    });
  const keysSpy = vi.spyOn(entries, 'keys').mockImplementation(function* () {
    for (const key of originalKeys()) {
      visited++;
      yield key;
    }
    return undefined;
  });
  let values: unknown[] = [];
  const stop = autorun(() => {
    values = rows.map((row) => [row.mapEntryKey, row.data]);
  });
  try {
    expect(values).toHaveLength(1000);
    expect(visited).toBeLessThanOrEqual(1000);
    const before = visited;
    act(() =>
      runInAction(() => {
        entries.set(999, 42);
      }),
    );
    expect(values.at(-1)).toEqual([999, 42]);
    expect(visited).toBe(before);
    act(() =>
      runInAction(() => {
        entries.delete(0);
        entries.set(1000, 1000);
      }),
    );
    expect(values[0]).toEqual([1, 1]);
    expect(values.at(-1)).toEqual([1000, 1000]);
    expect(visited - before).toBe(1000);
  } finally {
    stop();
    entriesSpy.mockRestore();
    keysSpy.mockRestore();
  }
});

it('reads only the bounded object preview instead of evaluating every getter', () => {
  let reads = 0;
  const object = Object.defineProperties(
    {},
    Object.fromEntries(
      Array.from({ length: 10000 }, (_, index) => [
        String(index),
        {
          enumerable: true,
          get: () => {
            reads++;
            return index;
          },
        },
      ]),
    ),
  );
  const preview = prepareObjectInlinePreview(object);
  expect(preview.totalCount).toBe(10000);
  expect(preview.scannedEntries).toHaveLength(INLINE_PREVIEW_MAX_ITEMS);
  expect(reads).toBe(INLINE_PREVIEW_MAX_ITEMS);
});

it('does not materialize descendants or serialize the full object for a collapsed row', () => {
  let reads = 0;
  const details = Object.defineProperties(
    {},
    Object.fromEntries(
      Array.from({ length: 2000 }, (_, index) => [
        String(index),
        {
          enumerable: true,
          get: () => {
            reads++;
            return index;
          },
        },
      ]),
    ),
  );
  const ui = inspect({ details }, ['details'], () => null);
  expect(ui.item.isExpandable).toBe(true);
  expect(ui.item.inspector.items.size).toBeLessThan(20);
  expect(reads).toBeLessThanOrEqual(INLINE_PREVIEW_MAX_ITEMS);
});

it('serializes the full value only when Copy is requested', async () => {
  let reads = 0;
  const details = Object.defineProperties(
    {},
    Object.fromEntries(
      Array.from({ length: 1000 }, (_, index) => [
        String(index),
        {
          enumerable: true,
          get: () => {
            reads++;
            return index;
          },
        },
      ]),
    ),
  );
  const ui = inspect({ details }, ['details'], () => null);
  const before = reads;
  expect(before).toBeLessThanOrEqual(INLINE_PREVIEW_MAX_ITEMS);
  await ui.user.click(ui.row.getByTitle('Copy'));
  expect(JSON.parse(await navigator.clipboard.readText())['999']).toBe(999);
  expect(reads - before).toBe(1000);
  expect(ui.notifications).toEqual([]);
});

it('reports serialization errors when copying a circular object', async () => {
  const details: { self?: unknown } = {};
  details.self = details;
  const ui = inspect({ details }, ['details'], () => null);
  await ui.user.click(ui.row.getByTitle('Copy'));
  expect(ui.notifications[0].title).toContain('Failed to copy "details"');
  expect(details.self).toBe(details);
});

it('reports clipboard write failures without unhandled rejections', async () => {
  const ui = inspect({ value: 42 }, ['value'], () => null);
  const write = vi
    .spyOn(navigator.clipboard, 'writeText')
    .mockRejectedValue(new Error('Clipboard denied'));
  try {
    await ui.user.click(ui.row.getByTitle('Copy'));
    expect(ui.notifications[0].title).toContain('Clipboard denied');
  } finally {
    write.mockRestore();
  }
});
