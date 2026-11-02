// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react';
import { autorun, makeObservable, observable, runInAction } from 'mobx';
import { ViewModelBase } from 'mobx-view-model';
import { describe, expect, it, vi } from 'vitest';
import {
  hasMobxObject,
  isMobxComputedProperty,
  notifyPropertyOwner,
  propertyWriteNotifies,
} from '../../src/model/editing/mobx-edit-adapter';
import { getSetEntryIdentities } from '../../src/model/editing/set-entry-identity';
import { ListItemOperations } from '../../src/ui/devtools-content/list-item-operations';
import { inspect } from './inspect';

describe('reviewed edit regressions', () => {
  it('does not create an undefined Map key when the edited entry disappears', async () => {
    const model = observable({ entries: new Map([['key', 'old']]) });
    const ui = inspect(model, ['entries', '0'], () => [...model.entries]);
    await ui.user.click(ui.row.getByTitle('Edit'));
    await ui.user.clear(ui.row.getByRole('textbox'));
    await ui.user.paste('"new"');
    act(() =>
      runInAction(() => {
        model.entries.delete('key');
      }),
    );
    await ui.user.click(ui.row.getByTitle('Apply'));
    expect([...model.entries]).toEqual([]);
    expect(ui.notifications[0].title).toContain('Map entry was not found');
    expect(ui.row.getByRole('textbox')).toHaveValue('"new"');
  });

  it('checks MobX metadata without evaluating an unannotated getter', () => {
    const getter = vi.fn(() => 42);
    const model = observable({ value: 1 });
    Object.defineProperty(model, 'expensive', { get: getter });
    expect(hasMobxObject(model)).toBe(true);
    expect(isMobxComputedProperty(model, 'expensive')).toBe(false);
    expect(propertyWriteNotifies(model, 'expensive')).toBe(false);
    expect(getter).not.toHaveBeenCalled();
  });

  it('Force update bound view refreshes observers reading plain data in observable.ref', async () => {
    class Model extends ViewModelBase {
      details = { value: 1 };
      constructor() {
        super({
          id: 'force-update',
          payload: {},
          viewModels: { get: () => null } as never,
        });
        observable.ref(this, 'details');
        makeObservable(this);
      }
    }
    const model = new Model();
    const ui = inspect(model, ['details', 'value'], () => model.details.value);
    render(<ListItemOperations item={ui.root} />);
    model.details.value = 2;
    ui.expectApp(1);
    await ui.user.click(screen.getByTitle('Force update bound view'));
    ui.expectApp(2);
  });

  it('notifies consumers after an explicit in-place computed-owner refresh', () => {
    const snapshot = { value: 1 };
    const model = observable({
      get snapshot() {
        return snapshot;
      },
    });
    const observed: number[] = [];
    const stop = autorun(() => {
      observed.push(model.snapshot.value);
    });
    try {
      snapshot.value = 2;
      runInAction(() => {
        notifyPropertyOwner(model, 'snapshot');
      });
      expect(observed).toEqual([1, 2]);
    } finally {
      stop();
    }
  });

  it('does not expose a missing Set index as a property named undefined or -1', async () => {
    const model = observable({ entries: new Set(['old']) });
    const ui = inspect(model, ['entries', '0'], () => [...model.entries]);
    act(() =>
      runInAction(() => {
        model.entries.delete('old');
      }),
    );
    expect(ui.item.property).toBeUndefined();
    expect(ui.item.descriptor).toBeNull();
  });

  it('shares one index traversal across a large observed Set row list', () => {
    const entries = observable.set(
      Array.from({ length: 1000 }, (_, index) => index),
    );
    const parent = { data: entries };
    const values = vi.spyOn(entries, 'values');
    let indexes: Array<number | undefined> = [];
    const stop = autorun(() => {
      indexes = getSetEntryIdentities(parent).map((row) => row.index);
    });
    try {
      expect(indexes).toEqual(
        Array.from({ length: 1000 }, (_, index) => index),
      );
      expect(values).toHaveBeenCalledTimes(1);
      runInAction(() => {
        entries.delete(0);
        entries.add(1000);
      });
      expect(values).toHaveBeenCalledTimes(2);
    } finally {
      stop();
      values.mockRestore();
    }
  });
});

it('does not retarget an open Map editor to a different entry after deletion', async () => {
  const model = observable({
    entries: new Map([
      ['old', 1],
      ['other', 2],
    ]),
  });
  const ui = inspect(model, ['entries', '0'], () => [...model.entries]);
  await ui.user.click(ui.row.getByTitle('Edit'));
  await ui.user.clear(ui.row.getByRole('textbox'));
  await ui.user.paste('99');
  act(() =>
    runInAction(() => {
      model.entries.delete('old');
    }),
  );
  await ui.user.click(ui.row.getByTitle('Apply'));
  expect([...model.entries]).toEqual([['other', 2]]);
  expect(ui.notifications[0].title).toContain(
    'Map entry changed while editing',
  );
});

it('does not turn an open value editor into a function call after Map index changes', async () => {
  const called = vi.fn();
  const model = observable({
    entries: new Map<string, number | (() => void)>([
      ['old', 1],
      ['other', called],
    ]),
  });
  const ui = inspect(model, ['entries', '0'], () => [...model.entries.keys()]);
  await ui.user.click(ui.row.getByTitle('Edit'));
  await ui.user.clear(ui.row.getByRole('textbox'));
  await ui.user.paste('99');
  act(() =>
    runInAction(() => {
      model.entries.delete('old');
    }),
  );
  await ui.user.keyboard('{Enter}');
  expect(called).not.toHaveBeenCalled();
});

it('still supports explicit function calls through the Call editor', async () => {
  const called = vi.fn();
  const ui = inspect({ callback: called }, ['callback'], () => null);
  await ui.user.click(ui.row.getByTitle('Call'));
  await ui.user.type(ui.row.getByRole('textbox'), '7{Enter}');
  expect(called).toHaveBeenCalledWith(7);
  expect(ui.row.queryByRole('textbox')).not.toBeInTheDocument();
});
