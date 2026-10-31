import type { VMUsageInfo } from './types.js';

/**
 * Detects useViewModel/withViewModel/useCreateViewModel usage sites in the code.
 * Only matches calls where the first argument is a plain identifier (class reference),
 * not a string literal or expression.
 */
export function detectViewModelUsage(code: string): VMUsageInfo[] {
  const usages: VMUsageInfo[] = [];

  // useViewModel(SomeVM)
  const useViewModelRe = /useViewModel\s*\(\s*(\w+)\s*\)/g;
  let match: RegExpExecArray | null;
  while ((match = useViewModelRe.exec(code)) !== null) {
    usages.push({
      vmClassName: match[1],
      usageType: 'useViewModel',
    });
  }

  // withViewModel(SomeVM, ...) or withViewModel(SomeVM)(...)
  const withViewModelRe = /withViewModel\s*\(\s*(\w+)\s*[,)]/g;
  while ((match = withViewModelRe.exec(code)) !== null) {
    usages.push({
      vmClassName: match[1],
      usageType: 'withViewModel',
    });
  }

  // useCreateViewModel(SomeVM, ...)
  const useCreateVMRe = /useCreateViewModel\s*\(\s*(\w+)\s*[,)]/g;
  while ((match = useCreateVMRe.exec(code)) !== null) {
    usages.push({
      vmClassName: match[1],
      usageType: 'useCreateViewModel',
    });
  }

  return usages;
}
