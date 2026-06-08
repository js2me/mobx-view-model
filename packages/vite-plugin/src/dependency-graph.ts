import type { VMClassInfo, VMUsageInfo } from './types.js';

export class DependencyGraph {
  /** Map from absolute file path to the ViewModel classes it exports */
  private vmExports = new Map<string, VMClassInfo[]>();

  /** Map from absolute file path to the ViewModel usage sites it contains */
  private vmUsage = new Map<string, VMUsageInfo[]>();

  /** Reverse map: from VM class name to set of files that use it */
  private vmConsumers = new Map<string, Set<string>>();

  /** Map from VM class name to the file that exports it */
  private vmSourceFile = new Map<string, string>();

  addFile(
    filePath: string,
    classes: VMClassInfo[],
    usages: VMUsageInfo[],
  ): void {
    // Clean up old entries for this file
    this.removeFile(filePath);

    // Store VM exports
    if (classes.length > 0) {
      this.vmExports.set(filePath, classes);
      for (const cls of classes) {
        this.vmSourceFile.set(cls.name, filePath);
      }
    }

    // Store VM usages and update reverse map
    if (usages.length > 0) {
      this.vmUsage.set(filePath, usages);
      for (const usage of usages) {
        let consumers = this.vmConsumers.get(usage.vmClassName);
        if (!consumers) {
          consumers = new Set();
          this.vmConsumers.set(usage.vmClassName, consumers);
        }
        consumers.add(filePath);
      }
    }
  }

  removeFile(filePath: string): void {
    // Remove old VM exports
    const oldClasses = this.vmExports.get(filePath);
    if (oldClasses) {
      for (const cls of oldClasses) {
        // Only delete source file mapping if it still points to this file
        if (this.vmSourceFile.get(cls.name) === filePath) {
          this.vmSourceFile.delete(cls.name);
        }
      }
      this.vmExports.delete(filePath);
    }

    // Remove old VM usages from reverse map
    const oldUsages = this.vmUsage.get(filePath);
    if (oldUsages) {
      for (const usage of oldUsages) {
        const consumers = this.vmConsumers.get(usage.vmClassName);
        if (consumers) {
          consumers.delete(filePath);
          if (consumers.size === 0) {
            this.vmConsumers.delete(usage.vmClassName);
          }
        }
      }
      this.vmUsage.delete(filePath);
    }
  }

  getVmExports(filePath: string): VMClassInfo[] {
    return this.vmExports.get(filePath) ?? [];
  }

  getVmSourceFile(className: string): string | undefined {
    return this.vmSourceFile.get(className);
  }

  getVmType(className: string): VMClassInfo['type'] | undefined {
    const filePath = this.vmSourceFile.get(className);
    if (!filePath) return undefined;
    const classes = this.vmExports.get(filePath);
    return classes?.find((c) => c.name === className)?.type;
  }

  getVmConsumers(className: string): Set<string> {
    return this.vmConsumers.get(className) ?? new Set();
  }

  isVmFile(filePath: string): boolean {
    return this.vmExports.has(filePath);
  }
}
