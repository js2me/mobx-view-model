import { describe, it, expect } from 'vitest';
import { getRuntimeModuleSource } from '../store-access.js';

describe('getRuntimeModuleSource', () => {
  it('generates store subscription code without devtools', () => {
    const source = getRuntimeModuleSource();
    expect(source).toContain('viewModelsConfig');
    expect(source).toContain('__MOBX_VM_PLUGIN_STORES__');
    expect(source).not.toContain('ViewModelDevtools');
  });

  it('generates devtools code when devtools is true', () => {
    const source = getRuntimeModuleSource(true);
    expect(source).toContain('ViewModelDevtools');
    expect(source).toContain("from 'mobx-view-model-devtools'");
    expect(source).toContain('ViewModelDevtools.define');
    expect(source).toContain('ViewModelDevtools.connectViewModels');
    expect(source).toContain('ViewModelDevtools.connectExtras');
    expect(source).toContain('position');
  });

  it('passes devtools config when provided', () => {
    const source = getRuntimeModuleSource({
      position: 'bottom-left',
      defaultIsOpened: true,
    });
    expect(source).toContain('"bottom-left"');
    expect(source).toContain('true');
    expect(source).toContain('ViewModelDevtools.define');
  });

  it('uses default config values when devtools is true', () => {
    const source = getRuntimeModuleSource(true);
    expect(source).toContain('"top-right"');
    expect(source).toContain('false');
  });

  it('still includes store subscription when devtools is enabled', () => {
    const source = getRuntimeModuleSource(true);
    expect(source).toContain('__MOBX_VM_PLUGIN_STORES__');
    expect(source).toContain('__stores__');
  });

  it('captures lastPub before define() to avoid internal store overwriting it', () => {
    const source = getRuntimeModuleSource(true);
    expect(source).toContain('__lastStoreBeforeDefine__');
    expect(source).toMatch(
      /__lastStoreBeforeDefine__\s*=\s*__orig_storeCreate__\.lastPub/,
    );
    // define() call should come AFTER the capture
    const captureIndex = source.indexOf('__lastStoreBeforeDefine__');
    const defineIndex = source.indexOf('ViewModelDevtools.define');
    expect(captureIndex).toBeLessThan(defineIndex);
  });

  it('filters out devtools internal store via constructor check', () => {
    const source = getRuntimeModuleSource(true);
    expect(source).toContain('__devtoolsInternalCtor__');
    expect(source).toContain('store.constructor !== __devtoolsInternalCtor__');
  });

  it('connects the store captured before define()', () => {
    const source = getRuntimeModuleSource(true);
    expect(source).toContain('__connectDevtools__(__lastStoreBeforeDefine__)');
  });

  it('does not include lastPub fallback when devtools is enabled (handled in devtoolsSetup)', () => {
    const source = getRuntimeModuleSource(true);
    // The lastPub handling is inside devtoolsSetup, not duplicated after subscription
    const lastPubMatches = source.match(/__orig_storeCreate__\.lastPub/g);
    // Should appear exactly once — inside the devtoolsSetup block
    expect(lastPubMatches).toHaveLength(1);
  });
});
