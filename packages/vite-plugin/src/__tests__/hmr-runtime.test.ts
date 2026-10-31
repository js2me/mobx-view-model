import { describe, it, expect } from 'vitest';
import { generateHmrCode } from '../hmr-runtime.js';

describe('generateHmrCode', () => {
  it('generates HMR code for a single class', () => {
    const code = generateHmrCode(['CounterVM']);
    expect(code).toContain('CounterVM');
    expect(code).toContain('import.meta.hot');
    expect(code).toContain('import.meta.hot.dispose');
    expect(code).toContain('__vm_classes__');
    expect(code).toContain('viewModelIdsByClasses');
    expect(code).toContain('linkedAnchorVMClasses');
    expect(code).toContain('Object.setPrototypeOf');
  });

  it('generates HMR code for multiple classes', () => {
    const code = generateHmrCode(['CounterVM', 'UserVM']);
    expect(code).toContain('CounterVM');
    expect(code).toContain('UserVM');
  });

  it('returns empty string for empty class list', () => {
    const code = generateHmrCode([]);
    expect(code).toBe('');
  });

  it('includes store access via globalThis', () => {
    const code = generateHmrCode(['CounterVM']);
    expect(code).toContain('globalThis.__MOBX_VM_PLUGIN_STORES__');
  });
});
