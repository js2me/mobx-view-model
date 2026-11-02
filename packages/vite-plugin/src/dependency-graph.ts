import { normalizeModulePath } from './module-path.js';
import type { VMClassInfo, VMUsageInfo } from './types.js';

function consumerKey(name: string, sourceFile?: string) {
  return JSON.stringify([
    sourceFile ? normalizeModulePath(sourceFile) : null,
    name,
  ]);
}

export class DependencyGraph {
  private vmExports = new Map<string, VMClassInfo[]>();
  private vmUsage = new Map<string, VMUsageInfo[]>();
  private vmConsumers = new Map<string, Set<string>>();

  addFile(
    filePath: string,
    classes: VMClassInfo[],
    usages: VMUsageInfo[],
  ): void {
    filePath = normalizeModulePath(filePath);
    this.removeFile(filePath);
    if (classes.length) this.vmExports.set(filePath, classes);
    if (usages.length) {
      this.vmUsage.set(filePath, usages);
      for (const usage of usages) {
        const key = consumerKey(usage.vmClassName, usage.sourceFile);
        const consumers = this.vmConsumers.get(key) ?? new Set<string>();
        consumers.add(filePath);
        this.vmConsumers.set(key, consumers);
      }
    }
  }

  removeFile(filePath: string): void {
    filePath = normalizeModulePath(filePath);
    this.vmExports.delete(filePath);
    for (const usage of this.vmUsage.get(filePath) ?? []) {
      const key = consumerKey(usage.vmClassName, usage.sourceFile);
      const consumers = this.vmConsumers.get(key);
      consumers?.delete(filePath);
      if (!consumers?.size) this.vmConsumers.delete(key);
    }
    this.vmUsage.delete(filePath);
  }

  getVmExports(filePath: string): VMClassInfo[] {
    return this.vmExports.get(normalizeModulePath(filePath)) ?? [];
  }

  getVmSourceFile(className: string): string | undefined {
    const files = [...this.vmExports].filter(([, classes]) =>
      classes.some((cls) => cls.name === className),
    );
    return files.length === 1 ? files[0][0] : undefined;
  }

  getVmType(
    className: string,
    sourceFile = this.getVmSourceFile(className),
  ): VMClassInfo['type'] | undefined {
    return sourceFile
      ? this.vmExports
          .get(normalizeModulePath(sourceFile))
          ?.find((cls) => cls.name === className)?.type
      : undefined;
  }

  getVmConsumers(className: string, sourceFile?: string): Set<string> {
    return (
      this.vmConsumers.get(consumerKey(className, sourceFile)) ?? new Set()
    );
  }

  isVmFile(filePath: string): boolean {
    return this.vmExports.has(normalizeModulePath(filePath));
  }
}
