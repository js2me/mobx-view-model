// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInThisContext } from 'node:vm';
import { act } from '@testing-library/react';
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
