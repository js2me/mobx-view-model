import fs from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import MagicString from 'magic-string';
import type { Plugin } from 'vite';
import { DependencyGraph } from './dependency-graph.js';
import { detectObserverCalls } from './detect-observer.js';
import { detectViewModelClasses } from './detect-vm-classes.js';
import { detectViewModelUsage } from './detect-vm-usage.js';
import { generateHmrCode } from './hmr-runtime.js';
import { ModuleAnalysis } from './module-analysis.js';
import {
  getRuntimeModuleSource,
  RUNTIME_MODULE_ID,
  RUNTIME_MODULE_RESOLVED,
} from './store-access.js';
import type { MobxVmVitePluginOptions } from './types.js';

const PLUGIN_NAME = 'mobx-view-model-vite-plugin';

const _require = createRequire(import.meta.url);

const DEFAULT_OBSERVER_SOURCES = ['mobx-react-lite', 'mobx-react'];

/**
 * Resolves a package to its ESM entry point using the plugin's own
 * node_modules context. This is needed because the virtual runtime module
 * has no resolution context — Vite can't follow bare imports from it.
 */
function resolveEsmEntry(bareImport: string): string | undefined {
  try {
    const cjsPath = _require.resolve(bareImport);
    const pkgDir = dirname(cjsPath);
    const pkgJson = JSON.parse(
      fs.readFileSync(join(pkgDir, 'package.json'), 'utf8'),
    );
    const esmEntry =
      pkgJson.exports?.['.']?.import ?? pkgJson.module ?? 'index.js';
    return join(pkgDir, esmEntry);
  } catch {
    return undefined;
  }
}

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
  const modules = new ModuleAnalysis();

  let isProduction = false;

  return {
    name: PLUGIN_NAME,
    enforce: 'pre',

    configureServer(server) {
      const reload = () => server.ws.send({ type: 'full-reload' as const });
      server.ws.on('mobx-view-model:full-reload', reload);
      server.httpServer?.once('close', () =>
        server.ws.off('mobx-view-model:full-reload', reload),
      );
    },

    config() {
      // Force Vite to always resolve these packages from the project root,
      // preventing pnpm's nested node_modules from creating duplicate
      // instances. A single MobX instance is critical — two separate copies
      // break reactivity (the devtools' computed properties can't observe
      // observables created by the app's MobX).
      return {
        resolve: {
          dedupe: [
            'mobx',
            'mobx-view-model',
            'mobx-view-model-react',
            'react',
            'react-dom',
            'mobx-react-lite',
          ],
        },
      };
    },

    configResolved(config) {
      isProduction = config.command === 'build';
      modules.configure(config.root, config.resolve.alias);
    },

    resolveId(id, importer) {
      if (id === RUNTIME_MODULE_ID) {
        return RUNTIME_MODULE_RESOLVED;
      }
      // Resolve devtools and its external deps when imported from the virtual
      // runtime module (which has no resolution context). We must resolve the
      // ESM entry (not CJS) because the virtual module uses named imports.
      // pnpm isolates deps, so this.resolve(id, root) fails — the package
      // is only accessible from the plugin's own node_modules context.
      // We use createRequire (which resolves from the plugin's location)
      // to find the CJS path, then read the adjacent package.json to
      // determine the correct ESM entry point.
      if (importer === RUNTIME_MODULE_RESOLVED) {
        // mobx-view-model-devtools
        if (id === 'mobx-view-model-devtools') {
          return resolveEsmEntry(id);
        }
        // mobx-view-model (imported by the runtime module)
        if (id === 'mobx-view-model') {
          return resolveEsmEntry(id);
        }
        // mobx — needed by the bridge autorun to observe the host's store
        if (id === 'mobx') {
          return resolveEsmEntry(id);
        }
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

      modules.setSource(id, code);
      const importedVmClasses = modules.importedClasses(code, id);

      const s = new MagicString(code);
      let hasEdits = false;

      const classes = detectViewModelClasses(code, importedVmClasses, id);
      const usages = modules.resolveUsages(
        code,
        id,
        detectViewModelUsage(code),
      );

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
        const hmrCode = generateHmrCode(
          vmClassNames,
          classes.filter((cls) => cls.hasPrivateFields).map((cls) => cls.name),
        );
        log(`injecting HMR code into ${id} for:`, vmClassNames);
        s.append(hmrCode);
        hasEdits = true;
      }

      // Feature 2: Inject displayName for observer() components
      if (autoDisplayName) {
        const observerCalls = detectObserverCalls(code, observerSources, id);
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

      modules.setSource(file, content);
      const importedVmClasses = modules.importedClasses(content, file);
      const classes = detectViewModelClasses(content, importedVmClasses, file);
      const usages = modules.resolveUsages(
        content,
        file,
        detectViewModelUsage(content),
      );
      const previousClasses = graph.getVmExports(file);
      graph.addFile(file, classes, usages);

      // Removed or renamed classes cannot be matched to the previous instances.
      const currentNames = new Set(classes.map((current) => current.name));
      if (hmr && previousClasses.some((old) => !currentNames.has(old.name))) {
        ctx.server.ws.send({ type: 'full-reload' });
        return [];
      }

      // If this file doesn't export ViewModel classes, no special handling needed
      if (classes.length === 0) return;

      log(
        `HMR update in ${file}, VM classes:`,
        classes.map((c) => c.name),
      );

      // Find all consumer modules and ensure they're included in the HMR update
      const affectedModules = new Set(ctx.modules);

      for (const cls of classes) {
        const consumers = graph.getVmConsumers(cls.name, file);
        log(`  ${cls.name} consumers:`, [...consumers]);
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
