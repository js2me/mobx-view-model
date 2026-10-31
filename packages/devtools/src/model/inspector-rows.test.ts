import { describe, expect, it, vi } from 'vitest';
import { InspectorRows } from './inspector-rows';
import type { ListItem } from './list-item/list-item';

describe('lazy inspector rows', () => {
  it('materializes only the requested window and never materializes sticky lookups', () => {
    const rows = new InspectorRows();
    const item = {} as ListItem<any>;
    const create = vi.fn(() => item);
    for (let index = 0; index < 10000; index++)
      rows.append(create, index % 10 === 0);
    expect(rows.length).toBe(10000);
    expect(rows.findStickyIndex(9999)).toBe(9990);
    expect(rows.findStickyIndex(9990)).toBe(-1);
    expect(create).not.toHaveBeenCalled();
    expect(rows.slice(5000, 5040)).toHaveLength(40);
    expect(create).toHaveBeenCalledTimes(40);
    expect(rows.slice(-10, 2)).toEqual([item, item]);
    expect(rows.slice(9999, 20000)).toEqual([item]);
    expect(rows.at(-1)).toBeUndefined();
  });
  it('handles empty ranges and lists without group headers', () => {
    const rows = new InspectorRows();
    expect(rows.findStickyIndex(0)).toBe(-1);
    expect(rows.slice()).toEqual([]);
    rows.append(() => ({}) as ListItem<any>);
    expect(rows.findStickyIndex(10)).toBe(-1);
    expect(rows.slice(10, 1)).toEqual([]);
  });
});
