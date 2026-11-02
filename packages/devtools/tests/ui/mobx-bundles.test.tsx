// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInThisContext } from 'node:vm';
import { act } from '@testing-library/react';
import { observable, runInAction } from 'mobx';
import { describe, expect, it } from 'vitest';
import { inspect } from './inspect';

// Simulate two independent bundles of the same MobX build, including distinct
// administration symbols, while retaining MobX's default shared global state.
const require = createRequire(import.meta.url);
const source = readFileSync(
  require.resolve('mobx/dist/mobx.cjs.development.js'),
  'utf8',
);
const appExports = {};
runInThisContext(`(function(exports) {${source}\n})`)(appExports);
const appMobx = appExports as typeof import('mobx');

describe('application and devtools MobX bundles', () => {
  it('keeps computed consumers reactive after overriding a foreign computed', async () => {
    const model = appMobx.observable({
      source: 2,
      get value() {
        return this.source * 2;
      },
    });
    const consumer = appMobx.observable({
      get result() {
        return model.value * 10;
      },
    });
    const ui = inspect(model, ['value'], () => consumer.result);
    await ui.edit('7');
    ui.expectApp(70);
    await ui.edit('8');
    ui.expectApp(80);
    act(() =>
      appMobx.runInAction(() => {
        model.source = 3;
      }),
    );
    ui.expectApp(80);
    expect(ui.notifications).toEqual([]);
  });

  it('does not detach a foreign observable array exposed by a computed', async () => {
    const values = appMobx.observable.array([2, 3]);
    const model = appMobx.observable({
      get values() {
        return values;
      },
    });
    const ui = inspect(model, ['values', '0'], () => [...values]);
    await ui.edit('7');
    expect(model.values).toBe(values);
    ui.expectApp([7, 3]);
  });
});

it.each(['key', undefined, {}])(
  'notifies foreign shallow Map values for key %s',
  async (key) => {
    const entries = appMobx.observable.map([[key, { value: 1 }]], {
      deep: false,
    });
    const model = appMobx.observable({
      entries,
      get total() {
        return this.entries.get(key)!.value * 10;
      },
    });
    const ui = inspect(model, ['entries', '0', 'value'], () => model.total);
    await ui.edit('7');
    ui.expectApp(70);
  },
);

it('updates repeated computed overrides when the host MobX runtime is isolated', async () => {
  const isolatedExports = {};
  runInThisContext(`(function(exports) {${source}\n})`)(isolatedExports);
  const host = isolatedExports as typeof import('mobx');
  host.configure({ isolateGlobalState: true, enforceActions: 'never' });
  const model = host.observable({
    source: 1,
    get value() {
      return this.source * 2;
    },
  });
  const result = host.observable({
    get value() {
      return model.value * 10;
    },
  });
  const output = observable.box(0);
  const stop = host.autorun(() => {
    runInAction(() => {
      output.set(result.value);
    });
  });
  try {
    const ui = inspect(model, ['value'], () => output.get());
    await ui.edit('7');
    ui.expectApp(70);
    await ui.edit('8');
    ui.expectApp(80);
  } finally {
    stop();
  }
});
