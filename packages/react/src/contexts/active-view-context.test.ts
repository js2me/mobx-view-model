import { describe, expect, it } from 'vitest';
import { ActiveViewModelContext as SolidActiveContext } from '../../../solid/src/contexts/active-view-context.js';
import { ViewModelsContext as SolidStoreContext } from '../../../solid/src/contexts/view-models-context.js';
import { ActiveViewModelContext as ReactActiveContext } from './active-view-context.js';
import { ViewModelsContext as ReactStoreContext } from './view-models-context.js';

describe('framework contexts', () => {
  it('keeps React and Solid active and store contexts separate', () => {
    expect(ReactActiveContext).not.toBe(SolidActiveContext);
    expect(ReactStoreContext).not.toBe(SolidStoreContext);
    expect(ReactActiveContext.$$typeof).toBe(Symbol.for('react.context'));
    expect(ReactStoreContext.$$typeof).toBe(Symbol.for('react.context'));
    expect(SolidActiveContext).not.toHaveProperty('$$typeof');
    expect(SolidStoreContext).not.toHaveProperty('$$typeof');
  });
});
