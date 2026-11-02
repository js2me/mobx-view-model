// @vitest-environment jsdom
import { act } from '@testing-library/react';
import {
  computed,
  isObservable,
  makeObservable,
  observable,
  runInAction,
} from 'mobx';
import { describe, expect, it } from 'vitest';
import { inspect } from './inspect';

class Model {
  count = 2;
  enabled = true;
  text = 'hello';
  details = { name: 'old', nested: { value: 1 } };
  list = [1, 2];
  constructor() {
    makeObservable(this, {
      count: observable,
      enabled: observable,
      text: observable,
      details: observable,
      list: observable,
      doubled: computed,
      summary: computed,
      snapshot: computed,
      writable: computed,
    });
  }
  get doubled() {
    return this.count * 2;
  }
  get summary() {
    return `${this.doubled}/${this.text}`;
  }
  get snapshot() {
    return {
      nested: { value: this.count, keep: true },
      list: [{ value: this.count }],
      enabled: this.enabled,
    };
  }
  get writable() {
    return this.count * 3;
  }
  set writable(value: number) {
    this.count = value / 3;
  }
}

describe('editing observable properties through devtools rows', () => {
  it.each(['Enter', 'Apply'] as const)(
    'updates the app and chained computed values using %s',
    async (submit) => {
      const model = new Model();
      const ui = inspect(model, ['count'], () => model.summary);
      await ui.edit('7', submit);
      expect(model.count).toBe(7);
      ui.expectApp('14/hello');
      expect(ui.row.queryByRole('textbox')).not.toBeInTheDocument();
      expect(ui.row.getByText('7')).toBeInTheDocument();
      expect(ui.notifications).toEqual([]);
    },
  );

  it('toggles booleans repeatedly', async () => {
    const model = new Model();
    const ui = inspect(model, ['enabled'], () => model.enabled);
    for (const value of [false, true, false]) {
      await ui.user.click(ui.row.getByTitle('Toggle'));
      expect(model.enabled).toBe(value);
      ui.expectApp(value);
      expect(ui.row.getByText(String(value))).toBeInTheDocument();
    }
  });

  it.each(['Escape', 'Cancel'])('discards edits with %s', async (cancel) => {
    const model = new Model();
    const ui = inspect(model, ['count'], () => model.count);
    await ui.user.click(ui.row.getByTitle('Edit'));
    await ui.user.clear(ui.row.getByRole('textbox'));
    await ui.user.type(ui.row.getByRole('textbox'), '99');
    if (cancel === 'Escape') await ui.user.keyboard('{Escape}');
    else await ui.user.click(ui.row.getByTitle('Cancel'));
    expect(model.count).toBe(2);
    ui.expectApp(2);
    await ui.user.click(ui.row.getByTitle('Edit'));
    expect(ui.row.getByRole('textbox')).toHaveValue('2');
  });

  it('keeps invalid input open and lets the user correct it', async () => {
    const model = new Model();
    const ui = inspect(model, ['count'], () => model.count);
    await ui.edit('(');
    expect(model.count).toBe(2);
    expect(ui.row.getByRole('textbox')).toHaveValue('(');
    expect(ui.notifications[0].title).toContain(
      'Failed to parse value for "count"',
    );
    await ui.user.clear(ui.row.getByRole('textbox'));
    await ui.user.type(ui.row.getByRole('textbox'), '5{Enter}');
    ui.expectApp(5);
  });

  it('round-trips strings containing quotes, backslashes and newlines', async () => {
    const model = new Model();
    runInAction(() => {
      model.text = 'say "hello"\\path\nnext';
    });
    const original = model.text;
    const ui = inspect(model, ['text'], () => model.text);
    await ui.user.click(ui.row.getByTitle('Edit'));
    await ui.user.click(ui.row.getByRole('textbox'));
    await ui.user.keyboard('{Enter}');
    expect(ui.row.queryByRole('textbox')).not.toBeInTheDocument();
    expect(ui.notifications).toEqual([]);
    expect(model.text).toBe(original);
    ui.expectApp(original);
  });

  it.each([
    {
      path: ['details'],
      input: '{"name":"new","nested":{"value":4}}',
      read: (m: Model) => m.details,
      expected: { name: 'new', nested: { value: 4 } },
    },
    {
      path: ['list'],
      input: '[3,4,5]',
      read: (m: Model) => m.list,
      expected: [3, 4, 5],
    },
    {
      path: ['details', 'nested', 'value'],
      input: '9',
      read: (m: Model) => m.details.nested.value,
      expected: 9,
    },
    {
      path: ['list', '0'],
      input: '8',
      read: (m: Model) => m.list[0],
      expected: 8,
    },
  ])(
    'edits $path and preserves reactivity',
    async ({ path, input, read, expected }) => {
      const model = new Model();
      const ui = inspect(model, path, () => read(model));
      await ui.edit(input);
      expect(read(model)).toEqual(expected);
      ui.expectApp(expected);
      expect(ui.notifications).toEqual([]);
      expect(isObservable(model.details)).toBe(true);
      expect(isObservable(model.list)).toBe(true);
    },
  );
});

describe('editing computed properties through devtools rows', () => {
  it('pins a read-only computed, updates its consumers and supports repeated edits', async () => {
    const model = new Model();
    const ui = inspect(model, ['doubled'], () => model.summary);
    await ui.edit('20');
    expect(model.doubled).toBe(20);
    ui.expectApp('20/hello');
    await ui.edit('30', 'Apply');
    ui.expectApp('30/hello');
    act(() => {
      runInAction(() => {
        model.count = 9;
        model.text = 'updated';
      });
    });
    expect(model.doubled).toBe(30);
    ui.expectApp('30/updated');
    expect(ui.notifications).toEqual([]);
  });

  it('toggles a boolean computed without changing its source', async () => {
    const model = observable({
      source: true,
      get enabled() {
        return this.source;
      },
    });
    const ui = inspect(model, ['enabled'], () => model.enabled);
    await ui.user.click(ui.row.getByTitle('Toggle'));
    expect(model.enabled).toBe(false);
    expect(model.source).toBe(true);
    ui.expectApp(false);
    await ui.user.click(ui.row.getByTitle('Toggle'));
    ui.expectApp(true);
  });

  it('pins computed values with a setter, consistently with read-only computed edits', async () => {
    const model = new Model();
    const ui = inspect(model, ['writable'], () => model.writable);
    await ui.edit('30');
    expect(model.writable).toBe(30);
    expect(model.count).toBe(2);
    ui.expectApp(30);
    expect(ui.notifications).toEqual([]);
  });

  it.each([
    {
      path: ['snapshot', 'nested', 'value'],
      input: '9',
      expected: {
        nested: { value: 9, keep: true },
        list: [{ value: 2 }],
        enabled: true,
      },
    },
    {
      path: ['snapshot', 'nested'],
      input: '{"value":9,"keep":false}',
      expected: {
        nested: { value: 9, keep: false },
        list: [{ value: 2 }],
        enabled: true,
      },
    },
    {
      path: ['snapshot', 'list'],
      input: '[{"value":9}]',
      expected: {
        nested: { value: 2, keep: true },
        list: [{ value: 9 }],
        enabled: true,
      },
    },
    {
      path: ['snapshot', 'list', '0'],
      input: '{"value":9}',
      expected: {
        nested: { value: 2, keep: true },
        list: [{ value: 9 }],
        enabled: true,
      },
    },
    {
      path: ['snapshot', 'list', '0', 'value'],
      input: '9',
      expected: {
        nested: { value: 2, keep: true },
        list: [{ value: 9 }],
        enabled: true,
      },
    },
  ])(
    'persists nested edit $path in a computed snapshot',
    async ({ path, input, expected }) => {
      const model = new Model();
      const ui = inspect(model, path, () => model.snapshot);
      await ui.edit(input);
      expect(model.snapshot).toEqual(expected);
      ui.expectApp(expected);
      act(() => {
        runInAction(() => {
          model.count = 100;
        });
      });
      expect(model.snapshot).toEqual(expected);
      ui.expectApp(expected);
      expect(ui.notifications).toEqual([]);
    },
  );
});

describe('editing edge cases through devtools rows', () => {
  it('edits an observable property with an empty name', async () => {
    const model = observable({ '': 1 });
    const ui = inspect(model, [''], () => model['']);
    expect(ui.row.getByText('1')).toBeInTheDocument();
    await ui.edit('2');
    expect(model['']).toBe(2);
    ui.expectApp(2);
  });

  it('edits the length of an array returned by a computed', async () => {
    const model = new Model();
    const ui = inspect(
      model,
      ['snapshot', 'list', 'length'],
      () => model.snapshot,
    );
    await ui.edit('0');
    expect(model.snapshot.list).toEqual([]);
    ui.expectApp({ nested: { value: 2, keep: true }, list: [], enabled: true });
    expect(ui.row.getByText('0')).toBeInTheDocument();
    expect(ui.notifications).toEqual([]);
  });

  it.each([
    { initial: null, input: 'undefined', expected: undefined },
    { initial: undefined, input: 'null', expected: null },
    { initial: 1, input: 'NaN', expected: Number.NaN },
    { initial: 1, input: 'Infinity', expected: Number.POSITIVE_INFINITY },
    { initial: 1n, input: '42n', expected: 42n },
  ])('edits primitive $input', async ({ initial, input, expected }) => {
    const model = observable({ value: initial });
    const ui = inspect(model, ['value'], () => String(model.value));
    await ui.edit(input);
    expect(model.value).toBe(expected);
    ui.expectApp(String(expected));
    expect(ui.row.queryByRole('textbox')).not.toBeInTheDocument();
    expect(ui.notifications).toEqual([]);
  });

  it('reports assignment failure and allows cancelling without changing state', async () => {
    const model = Object.freeze({ value: 1 });
    const ui = inspect(model, ['value'], () => model.value);
    await ui.edit('2');
    expect(model.value).toBe(1);
    expect(ui.notifications[0].title).toContain('Failed to update "value"');
    expect(ui.row.getByRole('textbox')).toHaveValue('2');
    await ui.user.click(ui.row.getByTitle('Cancel'));
    expect(ui.row.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('edits an observable Map entry with an undefined key', async () => {
    const model = observable({ entries: new Map([[undefined, 'old']]) });
    const ui = inspect(model, ['entries', '0'], () =>
      model.entries.get(undefined),
    );
    await ui.edit('"new"');
    expect(model.entries.get(undefined)).toBe('new');
    ui.expectApp('new');
    expect(ui.notifications).toEqual([]);
  });

  it('edits an observable Set entry', async () => {
    const model = observable({ entries: new Set(['old', 'keep']) });
    const ui = inspect(model, ['entries', '0'], () => [...model.entries]);
    await ui.edit('"new"', 'Apply');
    expect([...model.entries]).toEqual(['keep', 'new']);
    ui.expectApp(['keep', 'new']);
    expect(ui.row.getByText('"new"')).toBeInTheDocument();
    await ui.edit('"again"');
    expect([...model.entries]).toEqual(['keep', 'again']);
    ui.expectApp(['keep', 'again']);
    expect(ui.notifications).toEqual([]);
  });
});

describe('computed array validation', () => {
  it('keeps an invalid length edit open without changing the computed', async () => {
    const model = new Model();
    const original = model.snapshot;
    const ui = inspect(
      model,
      ['snapshot', 'list', 'length'],
      () => model.snapshot,
    );
    await ui.edit('-1');
    expect(model.snapshot).toEqual(original);
    ui.expectApp(original);
    expect(ui.row.getByRole('textbox')).toHaveValue('-1');
    expect(ui.notifications[0].title).toContain('Failed to update "length"');
    await ui.user.clear(ui.row.getByRole('textbox'));
    await ui.user.type(ui.row.getByRole('textbox'), '0{Enter}');
    expect(model.snapshot.list).toEqual([]);
    expect(ui.row.queryByRole('textbox')).not.toBeInTheDocument();
  });
});
