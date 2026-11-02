// @vitest-environment jsdom
import { act } from '@testing-library/react';
import {
  computed,
  makeObservable,
  observable,
  reaction,
  runInAction,
} from 'mobx';
import { describe, expect, it } from 'vitest';
import { inspect } from './inspect';

function graph() {
  const source = observable({ value: 2, chooseLeft: true });
  const left = observable({
    get value() {
      return source.value * 2;
    },
  });
  const right = observable({
    get value() {
      return source.value * 3;
    },
  });
  const branch = observable({
    get value() {
      return source.chooseLeft ? left.value : right.value;
    },
  });
  const joined = observable({
    get sum() {
      return left.value + right.value;
    },
    get result() {
      return this.sum * 10;
    },
  });
  const model = observable({ source, left, right, branch, joined });
  return { model, source, left, right, branch, joined };
}

describe('computed dependency graphs edited through the UI', () => {
  it('propagates a pinned computed across objects into a diamond and a chain', async () => {
    const { model, source, left, right, branch, joined } = graph();
    const read = () => [
      left.value,
      right.value,
      branch.value,
      joined.sum,
      joined.result,
    ];
    const ui = inspect(model, ['left', 'value'], read, {
      additionalPaths: [['joined', 'result']],
    });
    ui.expectApp([4, 6, 4, 10, 100]);
    await ui.edit('20');
    expect(read()).toEqual([20, 6, 20, 26, 260]);
    ui.expectApp([20, 6, 20, 26, 260]);
    expect(
      ui.rowFor(['joined', 'result']).getByText('260'),
    ).toBeInTheDocument();
    await ui.edit('30');
    ui.expectApp([30, 6, 30, 36, 360]);
    act(() =>
      runInAction(() => {
        source.value = 3;
      }),
    );
    ui.expectApp([30, 9, 30, 39, 390]);
    expect(ui.notifications).toEqual([]);
  });

  it('switches conditional computed dependencies after a pin', async () => {
    const { model, source, left, branch } = graph();
    const ui = inspect(model, ['left', 'value'], () => branch.value);
    await ui.edit('20');
    ui.expectApp(20);
    act(() =>
      runInAction(() => {
        source.chooseLeft = false;
      }),
    );
    ui.expectApp(6);
    await ui.edit('30');
    ui.expectApp(6);
    act(() =>
      runInAction(() => {
        source.chooseLeft = true;
      }),
    );
    expect(left.value).toBe(30);
    ui.expectApp(30);
  });

  it('keeps downstream overrides when an upstream computed is edited', async () => {
    const { model, source, joined } = graph();
    const ui = inspect(
      model,
      ['joined', 'sum'],
      () => [joined.sum, joined.result],
      {
        additionalPaths: [
          ['left', 'value'],
          ['joined', 'result'],
        ],
      },
    );
    await ui.edit('100');
    ui.expectApp([100, 1000]);
    await ui.edit('40', 'Apply', ui.rowFor(['left', 'value']));
    ui.expectApp([100, 1000]);
    await ui.edit('700', 'Enter', ui.rowFor(['joined', 'result']));
    await ui.edit('200');
    ui.expectApp([200, 700]);
    act(() =>
      runInAction(() => {
        source.value = 9;
      }),
    );
    ui.expectApp([200, 700]);
    expect(ui.notifications).toEqual([]);
  });

  it('updates a consumer held outside the inspected object graph', async () => {
    const producer = observable({
      input: 2,
      get value() {
        return this.input * 2;
      },
    });
    const consumer = observable({
      get value() {
        return producer.value * 10;
      },
    });
    const ui = inspect(producer, ['value'], () => consumer.value);
    await ui.edit('20');
    expect(consumer.value).toBe(200);
    ui.expectApp(200);
    await ui.edit('30');
    ui.expectApp(300);
  });

  it('updates standalone computed boxes depending on the edited computed', async () => {
    const model = observable({
      input: 2,
      get value() {
        return this.input * 2;
      },
    });
    const first = computed(() => model.value + 1);
    const second = computed(() => first.get() * 10);
    const ui = inspect(model, ['value'], () => second.get());
    await ui.edit('20');
    expect(second.get()).toBe(210);
    ui.expectApp(210);
    await ui.edit('30');
    ui.expectApp(310);
  });

  it('preserves computed.struct equality while updating changed dependent values', async () => {
    const model = observable(
      {
        input: 2,
        get snapshot() {
          return { parity: this.input % 2 };
        },
      },
      { snapshot: computed.struct },
    );
    const derived = observable({
      get value() {
        return model.snapshot.parity ? 'odd' : 'even';
      },
    });
    const ui = inspect(model, ['snapshot', 'parity'], () => derived.value);
    await ui.edit('1');
    expect(model.snapshot).toEqual({ parity: 1 });
    expect(derived.value).toBe('odd');
    ui.expectApp('odd');
    await ui.edit('0');
    ui.expectApp('even');
  });

  it('replaces an object returned by an upstream computed without pinning unrelated dependencies', async () => {
    const source = observable({ count: 2 });
    const model = observable({
      get snapshot() {
        return { nested: { count: source.count }, label: 'old' };
      },
      get total() {
        return this.snapshot.nested.count * 10;
      },
    });
    const ui = inspect(model, ['snapshot', 'nested'], () => [
      model.snapshot,
      model.total,
    ]);
    await ui.edit('{"count":7}');
    ui.expectApp([{ nested: { count: 7 }, label: 'old' }, 70]);
    await ui.edit('{"count":8}');
    ui.expectApp([{ nested: { count: 8 }, label: 'old' }, 80]);
    expect(ui.notifications).toEqual([]);
  });
});

class Service {
  count = 2;
  constructor() {
    makeObservable(this, {
      count: observable,
      value: computed,
      other: computed,
    });
  }
  get value() {
    return this.count * 2;
  }
  get other() {
    return this.count * 3;
  }
}

describe('nested computed owners', () => {
  it('edits a computed on a class instance exposed by another computed', async () => {
    const service = new Service();
    const model = observable({
      get service() {
        return service;
      },
    });
    const ui = inspect(model, ['service', 'value'], () => [
      model.service.value,
      model.service.other,
    ]);
    await ui.edit('20');
    expect(model.service).toBe(service);
    expect(service.value).toBe(20);
    ui.expectApp([20, 6]);
    act(() =>
      runInAction(() => {
        service.count = 3;
      }),
    );
    ui.expectApp([20, 9]);
    await ui.edit('30');
    ui.expectApp([30, 9]);
  });

  it('edits an observable returned by a computed without replacing its shared object', async () => {
    const service = new Service();
    const model = observable({
      get service() {
        return service;
      },
    });
    const ui = inspect(model, ['service', 'count'], () => [
      service.value,
      model.service.value,
    ]);
    await ui.edit('7');
    expect(model.service).toBe(service);
    expect(service.count).toBe(7);
    ui.expectApp([14, 14]);
  });

  it('edits an inner computed without pinning a computed wrapper around it', async () => {
    const service = new Service();
    const source = observable({ label: 'old' });
    const model = observable({
      get wrapper() {
        return { service, label: source.label };
      },
      get result() {
        return `${this.wrapper.label}:${this.wrapper.service.value}`;
      },
    });
    const ui = inspect(
      model,
      ['wrapper', 'service', 'value'],
      () => model.result,
    );
    await ui.edit('20');
    expect(service.value).toBe(20);
    expect(model.wrapper.service).toBe(service);
    ui.expectApp('old:20');
    act(() =>
      runInAction(() => {
        source.label = 'new';
      }),
    );
    ui.expectApp('new:20');
  });

  it('edits a computed projection that returns another computed snapshot', async () => {
    const source = observable({ count: 2 });
    const service = observable({
      get snapshot() {
        return { count: source.count, keep: true };
      },
    });
    const model = observable({
      service,
      get projection() {
        return this.service.snapshot;
      },
      get result() {
        return this.service.snapshot.count + this.projection.count;
      },
    });
    const ui = inspect(
      model,
      ['service', 'snapshot', 'count'],
      () => model.result,
    );
    await ui.edit('7');
    expect(service.snapshot).toEqual({ count: 7, keep: true });
    expect(model.projection).toEqual({ count: 7, keep: true });
    ui.expectApp(14);
    await ui.edit('8');
    ui.expectApp(16);
  });
});

describe('computed propagation consistency', () => {
  it('notifies reactions with a coherent diamond after each edit', async () => {
    const { model, left, right, joined } = graph();
    const seen: number[][] = [];
    const dispose = reaction(
      () => [left.value, right.value, joined.sum, joined.result],
      (values) => seen.push(values),
    );
    try {
      const ui = inspect(model, ['left', 'value'], () => joined.result);
      await ui.edit('20');
      expect(seen.length).toBeGreaterThan(0);
      expect(
        seen.every(
          ([left, right, sum, result]) =>
            left + right === sum && sum * 10 === result,
        ),
      ).toBe(true);
      expect(seen.at(-1)).toEqual([20, 6, 26, 260]);
      seen.length = 0;
      await ui.edit('30');
      expect(
        seen.every(
          ([left, right, sum, result]) =>
            left + right === sum && sum * 10 === result,
        ),
      ).toBe(true);
      expect(seen.at(-1)).toEqual([30, 6, 36, 360]);
    } finally {
      dispose();
    }
  });

  it('keeps an edited projection separate from its source computed', async () => {
    const service = observable({
      source: 2,
      get snapshot() {
        return { count: this.source };
      },
    });
    const model = observable({
      service,
      get projection() {
        return { count: service.snapshot.count * 2 };
      },
      get result() {
        return [service.snapshot.count, this.projection.count];
      },
    });
    const ui = inspect(model, ['projection', 'count'], () => model.result);
    await ui.edit('7');
    expect(service.snapshot).toEqual({ count: 2 });
    ui.expectApp([2, 7]);
    act(() =>
      runInAction(() => {
        service.source = 3;
      }),
    );
    ui.expectApp([3, 7]);
  });

  it('keeps observable.ref values shared through a computed wrapper', async () => {
    const service = observable(
      {
        details: { value: 2 },
        get result() {
          return this.details.value * 2;
        },
      },
      { details: observable.ref },
    );
    const details = service.details;
    const model = observable({
      get wrapper() {
        return { service };
      },
    });
    const ui = inspect(
      model,
      ['wrapper', 'service', 'details', 'value'],
      () => service.result,
    );
    await ui.edit('7');
    expect(service.details).toBe(details);
    expect(model.wrapper.service).toBe(service);
    ui.expectApp(14);
  });
});

describe('collection snapshots returned by computed properties', () => {
  it('persists a Map entry override and updates dependent computed values', async () => {
    const model = observable({
      source: 2,
      get entries() {
        return new Map([['key', this.source]]);
      },
      get total() {
        return this.entries.get('key')! * 10;
      },
    });
    const ui = inspect(model, ['entries', '0'], () => model.total);
    const original = model.entries;
    await ui.edit('7');
    expect(model.entries).toBeInstanceOf(Map);
    expect(model.entries).not.toBe(original);
    expect(original.get('key')).toBe(2);
    expect(model.entries.get('key')).toBe(7);
    ui.expectApp(70);
    act(() =>
      runInAction(() => {
        model.source = 3;
      }),
    );
    ui.expectApp(70);
    await ui.edit('8');
    ui.expectApp(80);
  });

  it('persists a Set entry override and updates dependent computed values', async () => {
    const model = observable({
      source: 2,
      get entries() {
        return new Set([this.source, 10]);
      },
      get total() {
        return [...this.entries].reduce((sum, value) => sum + value, 0);
      },
    });
    const ui = inspect(model, ['entries', '0'], () => model.total);
    await ui.edit('7');
    expect([...model.entries]).toEqual([7, 10]);
    ui.expectApp(17);
    act(() =>
      runInAction(() => {
        model.source = 3;
      }),
    );
    ui.expectApp(17);
    await ui.edit('8');
    ui.expectApp(18);
  });

  it('persists edits inside object values of a computed Map', async () => {
    const model = observable({
      source: 2,
      get entries() {
        return new Map([['key', { value: this.source, keep: true }]]);
      },
      get total() {
        return this.entries.get('key')!.value * 10;
      },
    });
    const ui = inspect(model, ['entries', '0', 'value'], () => model.total);
    await ui.edit('7');
    expect(model.entries.get('key')).toEqual({ value: 7, keep: true });
    ui.expectApp(70);
  });
});

describe('collection path and array snapshot regressions', () => {
  it('keeps nested Map and Set snapshots as collections', async () => {
    const key = {};
    const model = observable({
      source: 2,
      get snapshot() {
        return {
          entries: new Map([
            [key, new Set([{ value: this.source, keep: true }])],
          ]),
        };
      },
      get total() {
        return [...this.snapshot.entries.get(key)!][0].value * 10;
      },
    });
    const ui = inspect(
      model,
      ['snapshot', 'entries', '0', '0', 'value'],
      () => model.total,
    );
    await ui.edit('7');
    expect(model.snapshot.entries).toBeInstanceOf(Map);
    expect(model.snapshot.entries.get(key)).toBeInstanceOf(Set);
    expect([...model.snapshot.entries.get(key)!]).toEqual([
      { value: 7, keep: true },
    ]);
    ui.expectApp(70);
    await ui.edit('8');
    ui.expectApp(80);
  });

  it('keeps observable Map entries shared when accessed through a computed wrapper', async () => {
    const entries = observable.map([['key', { value: 2 }]]);
    const model = observable({
      get snapshot() {
        return { entries };
      },
    });
    const ui = inspect(
      model,
      ['snapshot', 'entries', '0', 'value'],
      () => entries.get('key')!.value,
    );
    await ui.edit('7');
    expect(model.snapshot.entries).toBe(entries);
    expect(entries.get('key')!.value).toBe(7);
    ui.expectApp(7);
  });

  it('allows an undefined key inside a computed Map', async () => {
    const model = observable({
      source: 2,
      get entries() {
        return new Map([[undefined, this.source]]);
      },
    });
    const ui = inspect(model, ['entries', '0'], () =>
      model.entries.get(undefined),
    );
    await ui.edit('7');
    expect(model.entries.has(undefined)).toBe(true);
    ui.expectApp(7);
  });

  it('preserves holes in computed arrays and updates consumers of their keys', async () => {
    const model = observable({
      source: 2,
      get values() {
        const values = new Array<number>(3);
        values[2] = this.source;
        return values;
      },
      get keys() {
        return Object.keys(this.values).join(',');
      },
    });
    const ui = inspect(model, ['values', '2'], () => [
      model.keys,
      model.values[2],
    ]);
    await ui.edit('7');
    expect(0 in model.values).toBe(false);
    expect(1 in model.values).toBe(false);
    ui.expectApp(['2', 7]);
  });

  it('edits custom properties on computed arrays without silently ignoring them', async () => {
    const model = observable({
      source: 2,
      get values() {
        return Object.assign([this.source], { label: 'old', '': 'empty' });
      },
      get result() {
        return `${this.values.label}/${this.values['']}/${this.values[0]}`;
      },
    });
    const ui = inspect(model, ['values', 'label'], () => model.result, {
      additionalPaths: [['values', '']],
    });
    await ui.edit('"new"');
    ui.expectApp('new/empty/2');
    await ui.edit('"changed"', 'Apply', ui.rowFor(['values', '']));
    ui.expectApp('new/changed/2');
    expect(model.values[0]).toBe(2);
  });
});

describe('shared observable arrays returned by computed properties', () => {
  it.each([
    { path: ['values', '0'], input: '7', expected: [7, 3] },
    { path: ['values', 'length'], input: '0', expected: [] },
  ])(
    'edits $path without detaching the array from other consumers',
    async ({ path, input, expected }) => {
      const values = observable.array([2, 3]);
      const model = observable({
        get values() {
          return values;
        },
      });
      const ui = inspect(model, path, () => [...values]);
      await ui.edit(input);
      expect(model.values).toBe(values);
      expect([...values]).toEqual(expected);
      ui.expectApp(expected);
      expect(ui.notifications).toEqual([]);
    },
  );
});
