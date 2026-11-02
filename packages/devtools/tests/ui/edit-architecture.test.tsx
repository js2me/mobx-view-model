// @vitest-environment jsdom
import { act, screen, within } from '@testing-library/react';
import {
  getAtom,
  intercept,
  isComputedProp,
  isObservable,
  observable,
  observe,
  reaction,
  runInAction,
} from 'mobx';
import { describe, expect, it, vi } from 'vitest';
import { inspect } from './inspect';

describe('targeted observable writes', () => {
  it('does not recalculate unrelated computed values or call VM lifecycle methods', async () => {
    const unrelated = vi.fn(() => 100);
    const setPayload = vi.fn();
    const model = observable({
      count: 2,
      payload: {},
      setPayload,
      get doubled() {
        return this.count * 2;
      },
      get unrelated() {
        return unrelated();
      },
    });
    const ui = inspect(model, ['count'], () => [
      model.doubled,
      model.unrelated,
    ]);
    unrelated.mockClear();
    await ui.edit('7');
    ui.expectApp([14, 100]);
    expect(unrelated).not.toHaveBeenCalled();
    expect(setPayload).not.toHaveBeenCalled();
  });

  it('keeps MobX reactions batched and emits one native property update', async () => {
    const model = observable({
      count: 2,
      get doubled() {
        return this.count * 2;
      },
    });
    const changes = vi.fn();
    const native = vi.fn();
    const disposeReaction = reaction(
      () => [model.count, model.doubled],
      changes,
    );
    const disposeObserve = observe(model, 'count', native);
    try {
      const ui = inspect(model, ['count'], () => model.doubled);
      await ui.edit('7');
      expect(changes).toHaveBeenCalledTimes(1);
      expect(changes.mock.calls[0][0]).toEqual([7, 14]);
      expect(native).toHaveBeenCalledTimes(1);
    } finally {
      disposeReaction();
      disposeObserve();
    }
  });

  it('honors observable interception instead of replacing the property', async () => {
    const model = observable({ count: 2 });
    const dispose = intercept(model, 'count', () => null);
    try {
      const ui = inspect(model, ['count'], () => model.count);
      await ui.edit('7');
      expect(model.count).toBe(2);
      ui.expectApp(2);
    } finally {
      dispose();
    }
  });

  it('does not freeze observable objects created by a computed getter', async () => {
    const model = observable({
      source: 2,
      get snapshot() {
        return observable({ value: this.source });
      },
    });
    const ui = inspect(
      model,
      ['snapshot', 'value'],
      () => model.snapshot.value,
    );
    const first = model.snapshot;
    await ui.edit('7');
    expect(model.snapshot).toBe(first);
    expect(isObservable(first)).toBe(true);
    ui.expectApp(7);
    act(() =>
      runInAction(() => {
        model.source = 3;
      }),
    );
    expect(model.snapshot).not.toBe(first);
    ui.expectApp(3);
  });
});

describe('computed override adapter', () => {
  it('keeps the computed atom and lets MobX track its new source', async () => {
    const getter = vi.fn((source: number) => source * 2);
    const model = observable({
      source: 2,
      get value() {
        return getter(this.source);
      },
    });
    const atom = getAtom(model, 'value');
    const consumer = observable({
      get result() {
        return model.value * 10;
      },
    });
    const ui = inspect(model, ['value'], () => consumer.result);
    await ui.edit('7');
    expect(getAtom(model, 'value')).toBe(atom);
    expect(isComputedProp(model, 'value')).toBe(true);
    getter.mockClear();
    act(() =>
      runInAction(() => {
        model.source = 3;
      }),
    );
    expect(getter).not.toHaveBeenCalled();
    ui.expectApp(70);
    await ui.edit('8');
    expect(getAtom(model, 'value')).toBe(atom);
    ui.expectApp(80);
  });

  it('does not notify reactions when an override remains equal', async () => {
    const model = observable({
      get value() {
        return 2;
      },
    });
    const changes = vi.fn();
    const dispose = reaction(() => model.value, changes);
    try {
      const ui = inspect(model, ['value'], () => model.value);
      await ui.edit('2');
      expect(changes).not.toHaveBeenCalled();
      await ui.edit('3');
      expect(changes).toHaveBeenCalledTimes(1);
    } finally {
      dispose();
    }
  });
});

function siblingRow(value: string) {
  return within(screen.getByTestId('siblings'))
    .getByText(value)
    .closest('[data-row-id]') as HTMLElement;
}

describe('Set row identity instead of collection reordering', () => {
  it('retains DOM rows across replacement and only mutates the affected members', async () => {
    const model = observable({ entries: new Set(['old', 'keep']) });
    const events: { type: string; value: unknown }[] = [];
    const dispose = observe(model.entries, (event) =>
      events.push({
        type: event.type,
        value: event.type === 'add' ? event.newValue : event.oldValue,
      }),
    );
    try {
      const ui = inspect(model, ['entries', '0'], () => [...model.entries], {
        siblings: true,
      });
      const edited = siblingRow('"old"');
      const untouched = siblingRow('"keep"');
      await ui.edit('"new"', 'Apply', within(edited));
      expect([...model.entries]).toEqual(['keep', 'new']);
      expect(siblingRow('"new"')).toBe(edited);
      expect(siblingRow('"keep"')).toBe(untouched);
      expect(events).toEqual([
        { type: 'add', value: 'new' },
        { type: 'delete', value: 'old' },
      ]);
      await ui.edit('"again"', 'Enter', within(edited));
      expect([...model.entries]).toEqual(['keep', 'again']);
      expect(siblingRow('"again"')).toBe(edited);
    } finally {
      dispose();
    }
  });

  it('keeps an open editor attached to its value when another entry is removed', async () => {
    const model = observable({ entries: new Set(['first', 'edited', 'last']) });
    const ui = inspect(model, ['entries', '1'], () => [...model.entries], {
      siblings: true,
    });
    const edited = siblingRow('"edited"');
    await ui.user.click(within(edited).getByTitle('Edit'));
    await ui.user.clear(within(edited).getByRole('textbox'));
    await ui.user.paste('"new"');
    act(() =>
      runInAction(() => {
        model.entries.delete('first');
      }),
    );
    await ui.user.click(within(edited).getByTitle('Apply'));
    expect([...model.entries]).toEqual(['last', 'new']);
    expect(siblingRow('"new"')).toBe(edited);
  });

  it('merges into an existing member without replacing its row', async () => {
    const model = observable({ entries: new Set(['old', 'keep']) });
    const ui = inspect(model, ['entries', '0'], () => [...model.entries], {
      siblings: true,
    });
    const old = siblingRow('"old"');
    const keep = siblingRow('"keep"');
    await ui.edit('"keep"', 'Apply', within(old));
    expect([...model.entries]).toEqual(['keep']);
    expect(old).not.toBeInTheDocument();
    expect(siblingRow('"keep"')).toBe(keep);
  });

  it('binds a replaced object to its enhanced ObservableSet value', async () => {
    const model = observable({ entries: new Set([{ value: 2 }]) });
    const ui = inspect(model, ['entries', '0'], () => [...model.entries]);
    await ui.edit('{"value":7}');
    expect(isObservable([...model.entries][0])).toBe(true);
    ui.expectApp([{ value: 7 }]);
    await ui.edit('{"value":8}');
    ui.expectApp([{ value: 8 }]);
  });

  it('does not delete the old value if interception rejects the replacement', async () => {
    const model = observable({ entries: new Set(['old', 'keep']) });
    const dispose = intercept(model.entries, (change) =>
      change.type === 'add' ? null : change,
    );
    try {
      const ui = inspect(model, ['entries', '0'], () => [...model.entries]);
      await ui.edit('"new"');
      expect([...model.entries]).toEqual(['old', 'keep']);
      expect(ui.row.getByRole('textbox')).toHaveValue('"new"');
      expect(ui.notifications[0].title).toContain('Set rejected the new value');
    } finally {
      dispose();
    }
  });
});

describe('plain values inside shallow observable collections', () => {
  it('notifies the edited Map value instead of the map key list', async () => {
    const entries = observable.map([['key', { value: 2 }]], { deep: false });
    const model = observable({
      entries,
      get result() {
        return this.entries.get('key')!.value * 10;
      },
    });
    const ui = inspect(model, ['entries', '0', 'value'], () => model.result);
    await ui.edit('7');
    expect(isObservable(entries.get('key'))).toBe(false);
    ui.expectApp(70);
  });

  it('notifies the Set atom after editing a plain member', async () => {
    const entries = observable.set([{ value: 2 }], { deep: false });
    const model = observable({
      entries,
      get result() {
        return [...this.entries][0].value * 10;
      },
    });
    const ui = inspect(model, ['entries', '0', 'value'], () => model.result);
    await ui.edit('7');
    expect(isObservable([...entries][0])).toBe(false);
    ui.expectApp(70);
  });
});

it('rolls back a Set replacement if removal of the old member is rejected', async () => {
  const model = observable({ entries: new Set(['old', 'keep']) });
  const dispose = intercept(model.entries, (change) =>
    change.type === 'delete' && change.oldValue === 'old' ? null : change,
  );
  try {
    const ui = inspect(model, ['entries', '0'], () => [...model.entries]);
    await ui.edit('"new"');
    expect([...model.entries]).toEqual(['old', 'keep']);
    ui.expectApp(['old', 'keep']);
    expect(ui.row.getByRole('textbox')).toHaveValue('"new"');
    expect(ui.notifications[0].title).toContain('Set rejected removal');
  } finally {
    dispose();
  }
});

it('reports retained values when an interceptor rejects both removal and rollback', async () => {
  const model = observable({ entries: new Set(['old', 'keep']) });
  const dispose = intercept(model.entries, (change) =>
    change.type === 'delete' ? null : change,
  );
  try {
    const ui = inspect(model, ['entries', '0'], () => [...model.entries]);
    await ui.edit('"new"');
    expect([...model.entries]).toEqual(['old', 'keep', 'new']);
    ui.expectApp(['old', 'keep', 'new']);
    expect(ui.notifications[0].title).toContain(
      'both the old and new values were retained',
    );
    expect(ui.row.getByRole('textbox')).toHaveValue('"new"');
  } finally {
    dispose();
  }
});
