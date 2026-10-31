import { describe, it, expect } from 'vitest';
import { detectViewModelUsage } from '../detect-vm-usage.js';

describe('detectViewModelUsage', () => {
  it('detects useViewModel(SomeVM)', () => {
    const code = `const model = useViewModel(CounterVM);`;
    const result = detectViewModelUsage(code);
    expect(result).toHaveLength(1);
    expect(result[0].vmClassName).toBe('CounterVM');
    expect(result[0].usageType).toBe('useViewModel');
  });

  it('detects withViewModel(SomeVM, Component)', () => {
    const code = `export const Counter = withViewModel(CounterVM, () => <div />);`;
    const result = detectViewModelUsage(code);
    expect(result).toHaveLength(1);
    expect(result[0].vmClassName).toBe('CounterVM');
    expect(result[0].usageType).toBe('withViewModel');
  });

  it('detects withViewModel(SomeVM)(Component)', () => {
    const code = `export const Counter = withViewModel(CounterVM)(CounterView);`;
    const result = detectViewModelUsage(code);
    expect(result).toHaveLength(1);
    expect(result[0].vmClassName).toBe('CounterVM');
    expect(result[0].usageType).toBe('withViewModel');
  });

  it('detects useCreateViewModel(SomeVM, payload)', () => {
    const code = `const model = useCreateViewModel(UserVM, { userId: 1 });`;
    const result = detectViewModelUsage(code);
    expect(result).toHaveLength(1);
    expect(result[0].vmClassName).toBe('UserVM');
    expect(result[0].usageType).toBe('useCreateViewModel');
  });

  it('detects multiple usages in one file', () => {
    const code = `
const model = useViewModel(CounterVM);
const user = useViewModel(UserVM);
export const Page = withViewModel(PageVM, PageView);
`;
    const result = detectViewModelUsage(code);
    expect(result).toHaveLength(3);
    expect(result.map((u) => u.vmClassName)).toEqual([
      'CounterVM',
      'UserVM',
      'PageVM',
    ]);
  });

  it('ignores useViewModel() without arguments', () => {
    const code = `const model = useViewModel();`;
    const result = detectViewModelUsage(code);
    expect(result).toHaveLength(0);
  });

  it('ignores useViewModel with string argument', () => {
    const code = `const model = useViewModel("counter");`;
    const result = detectViewModelUsage(code);
    expect(result).toHaveLength(0);
  });
});
