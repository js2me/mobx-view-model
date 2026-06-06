import { createRequire } from 'node:module';
import fs from 'node:fs';
import { dirname, join } from 'node:path';
import type { Plugin } from 'vite';
import MagicString from 'magic-string';
import { DependencyGraph } from './dependency-graph.js';
import {
  detectViewModelClasses,
  extractImportBindings,
} from './detect-vm-classes.js';
import type { ImportedVmClass } from './detect-vm-classes.js';
import { detectViewModelUsage } from './detect-vm-usage.js';
import { detectObserverCalls } from './detect-observer.js';
import { generateHmrCode } from './hmr-runtime.js';
import {
  RUNTIME_MODULE_ID,
  RUNTIME_MODULE_RESOLVED,
  getRuntimeModuleSource,
} from './store-access.js';
import type { MobxVmVitePluginOptions } from './types.js';

const PLUGIN_NAME = 'mobx-view-model-vite-plugin';

const _require = createRequire(import.meta.url);

const MOBX_VM_IMPORT_RE = /from\s+['"]mobx-view-model(?:\/react|\/core)?['"]/;

const DEFAULT_OBSERVER_SOURCES = ['mobx-react-lite', 'mobx-react'];

export function mobxVmVitePlugin(options?: MobxVmVitePluginOptions): Plugin {
  const hmr = options?.hmr ?? true;
  const autoDisplayName = options?.autoDisplayName ?? true;
  const devtools = options?.devtools;
  const observerSources = options?.observerSources ?? DEFAULT_OBSERVER_SOURCES;
  const debug = options?.debug ?? false;

  const log = debug
    ? (...args: unknown[]) => console.log(`[${PLUGIN_NAME}]`, ...args)
    : () => {};

  const graph = new DependencyGraph();

  let isProduction = false;
  let _root = '';

  return {
    name: PLUGIN_NAME,

    configResolved(config) {
      isProduction = config.command === 'build';
      _root = config.root;
    },

    resolveId(id, importer) {
      if (id === RUNTIME_MODULE_ID) {
        return RUNTIME_MODULE_RESOLVED;
      }
      // Resolve devtools when imported from the virtual runtime module
      // (which has no resolution context). We must resolve the ESM entry
      // (not CJS) because the virtual module uses named imports.
      // pnpm isolates deps, so this.resolve(id, root) fails — the package
      // is only accessible from the plugin's own node_modules context.
      // We use createRequire (which resolves from the plugin's location)
      // to find the CJS path, then read the adjacent package.json to
      // determine the correct ESM entry point.
      if (
        id === 'mobx-view-model-devtools' &&
        importer === RUNTIME_MODULE_RESOLVED
      ) {
        const cjsPath = _require.resolve('mobx-view-model-devtools');
        const pkgDir = dirname(cjsPath);
        const pkgJson = JSON.parse(
          fs.readFileSync(join(pkgDir, 'package.json'), 'utf8'),
        );
        const esmEntry =
          pkgJson.exports?.['.']?.import ?? pkgJson.module ?? 'index.js';
        return join(pkgDir, esmEntry);
      }
    },

    load(id) {
      if (id === RUNTIME_MODULE_RESOLVED) {
        return getRuntimeModuleSource(devtools);
      }
    },

    transform(code, id) {
      if (isProduction) return;
      if (!id.endsWith('.ts') && !id.endsWith('.tsx')) return;
      if (id.includes('node_modules')) return;
      if (id === RUNTIME_MODULE_RESOLVED) return;

      const isMobxVmFile = MOBX_VM_IMPORT_RE.test(code);
      const isObserverFile = observerSources.some((source) => {
        const re = new RegExp(
          `from\\s+['"]${source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`,
        );
        return re.test(code);
      });

      // Resolve imported VM classes from the dependency graph for cross-file inheritance
      const importedVmClasses: ImportedVmClass[] = [];
      const importBindings = extractImportBindings(code);
      for (const binding of importBindings) {
        const vmType = graph.getVmType(binding.importedName);
        if (vmType) {
          importedVmClasses.push({
            localName: binding.localName,
            type: vmType,
          });
        }
      }

      // Skip files that have no mobx-view-model imports, no observer imports,
      // and don't import any known VM classes from other files
      if (!isMobxVmFile && !isObserverFile && importedVmClasses.length === 0)
        return;

      const s = new MagicString(code);
      let hasEdits = false;

      const classes = detectViewModelClasses(code, importedVmClasses);
      const usages = detectViewModelUsage(code);

      if (classes.length > 0) {
        log(
          `detected VM classes in ${id}:`,
          classes.map((c) => `${c.name} (${c.type})`),
        );
      }
      if (usages.length > 0) {
        log(
          `detected VM usages in ${id}:`,
          usages.map((u) => `${u.usageType}(${u.vmClassName})`),
        );
      }

      graph.addFile(id, classes, usages);

      // Inject runtime module import into files with ViewModel classes
      // ESM deduplicates imports, so multiple imports are safe
      // Also inject when devtools is enabled (even without HMR)
      const needsRuntime = (hmr || devtools) && classes.length > 0;
      if (needsRuntime) {
        log(`injecting runtime import into ${id}`);
        s.prepend(`import '${RUNTIME_MODULE_ID}';\n`);
        hasEdits = true;
      }

      // Feature 1: Inject HMR code into ViewModel class files
      if (hmr && classes.length > 0) {
        const vmClassNames = classes.map((c) => c.name);
        const hmrCode = generateHmrCode(vmClassNames);
        if (hmrCode) {
          log(`injecting HMR code into ${id} for:`, vmClassNames);
          s.append(hmrCode);
          hasEdits = true;
        }
      }

      // Feature 2: Inject displayName for observer() components
      if (autoDisplayName) {
        const observerCalls = detectObserverCalls(code, observerSources);
        if (observerCalls.length > 0) {
          log(
            `detected observer calls in ${id}:`,
            observerCalls.map((c) => c.varName),
          );
        }
        // Process in reverse order to avoid offset shifts
        for (let i = observerCalls.length - 1; i >= 0; i--) {
          const call = observerCalls[i];
          const displayNameCode = `\n${call.varName}.displayName = "${call.varName}";`;
          s.appendRight(call.statementEnd, displayNameCode);
          hasEdits = true;
        }
      }

      if (!hasEdits) return;

      return {
        code: s.toString(),
        map: s.generateMap({ hires: true }),
      };
    },

    async handleHotUpdate(ctx) {
      if (isProduction) return;
      const { file } = ctx;
      if (!file.endsWith('.ts') && !file.endsWith('.tsx')) return;
      if (file.includes('node_modules')) return;

      // Re-analyze the changed file from disk
      let content: string;
      try {
        content = fs.readFileSync(file, 'utf8');
      } catch {
        return;
      }

      const importedVmClasses: ImportedVmClass[] = [];
      const importBindings = extractImportBindings(content);
      for (const binding of importBindings) {
        const vmType = graph.getVmType(binding.importedName);
        if (vmType) {
          importedVmClasses.push({
            localName: binding.localName,
            type: vmType,
          });
        }
      }
      const classes = detectViewModelClasses(content, importedVmClasses);
      const usages = detectViewModelUsage(content);
      graph.addFile(file, classes, usages);

      // If this file doesn't export ViewModel classes, no special handling needed
      if (classes.length === 0) return;

      log(
        `HMR update in ${file}, VM classes:`,
        classes.map((c) => c.name),
      );

      // Find all consumer modules and ensure they're included in the HMR update
      const affectedModules = new Set(ctx.modules);

      for (const cls of classes) {
        const consumers = graph.getVmConsumers(cls.name);
        if (consumers.size > 0) {
          log(`  ${cls.name} consumers:`, [...consumers]);
        }
        for (const consumerPath of consumers) {
          const mods = ctx.server.moduleGraph.getModulesByFile(consumerPath);
          if (mods) {
            for (const mod of mods) {
              affectedModules.add(mod);
            }
          }
        }
      }

      return [...affectedModules];
    },
  };
}
