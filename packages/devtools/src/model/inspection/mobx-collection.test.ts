import { observable } from 'mobx';
import { expect, it } from 'vitest';
import { isMobxObservableMap, isNativeMap } from './mobx-collection';

it.each(['entries', 'keys', 'get'])(
  'rejects a Map marker missing %s',
  (method) => {
    const value = {
      isMobXObservableMap: true,
      entries() {},
      keys() {},
      get() {},
      [method]: undefined,
    };
    expect(isMobxObservableMap(value)).toBe(false);
  },
);

it.each(['entries', 'keys', 'get'])(
  'rejects a native Map with a shadowed %s method',
  (method) => {
    const value = new Map();
    Object.defineProperty(value, method, { value: undefined });
    expect(isNativeMap(value)).toBe(false);
  },
);

it('recognizes native and observable Maps with complete read methods', () => {
  expect(isNativeMap(new Map())).toBe(true);
  expect(isMobxObservableMap(observable.map())).toBe(true);
  expect(isMobxObservableMap(null)).toBe(false);
});
