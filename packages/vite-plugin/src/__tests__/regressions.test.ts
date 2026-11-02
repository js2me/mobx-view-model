import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  action,
  computed,
  isComputedProp,
  isObservableProp,
  makeObservable,
} from 'mobx';
import { createServer } from 'vite';
import { describe, expect, it, vi } from 'vitest';
import { DependencyGraph } from '../dependency-graph.js';
import { generateHmrCode } from '../hmr-runtime.js';
import { mobxVmVitePlugin } from '../index.js';

function transform(code: string, id = '/src/model.ts') {
  return (mobxVmVitePlugin().transform as Function)(code, id) as
    | { code: string }
    | undefined;
}

function update(Old: any, Next: any, source: string, instance = new Old()) {
  const transformed = transform(source)!;
  const runtime = transformed.code
    .slice(transformed.code.indexOf('if (import.meta.hot)'))
    .replaceAll('import.meta.hot', 'hot');
  const store = {
    viewModelIdsByClasses: new Map([[Old, ['vm']]]),
    linkedAnchorVMClasses: new Map([['anchor', Old]]),
    viewModels: new Map([['vm', instance]]),
  };
  const hot = {
    data: { __vm_classes__: { VM: Old } },
    dispose: vi.fn(),
    send: vi.fn(),
  };
  new Function(
    'VM',
    'hot',
    'globalThis',
    '__vm_isObservableProp__',
    '__vm_isComputedProp__',
    runtime,
  )(
    Next,
    hot,
    {
      __MOBX_VM_PLUGIN_STORES__: [store],
    },
    isObservableProp,
    isComputedProp,
  );
  return { instance, store, hot };
}

describe('HMR safety', () => {
  it('requests a full reload before mutating an instance with private fields', () => {
    class Old {
      #value = 1;
      read() {
        return this.#value;
      }
    }
    class Next {
      #value = 1;
      read() {
        return this.#value;
      }
    }
    const { instance, store, hot } = update(
      Old,
      Next,
      "import type { ViewModel } from 'mobx-view-model'; export class VM implements ViewModel { #value = 1; read() { return this.#value; } }",
    );
    expect(hot.send).toHaveBeenCalledWith('mobx-view-model:full-reload');
    expect(instance.read()).toBe(1);
    expect(store.viewModelIdsByClasses.has(Old)).toBe(true);
    expect(store.linkedAnchorVMClasses.get('anchor')).toBe(Old);
  });

  it.each(['computed', 'bound action'] as const)(
    'reloads instead of preserving a stale %s',
    (kind) => {
      class Old {
        constructor() {
          makeObservable(
            this,
            kind === 'computed' ? { value: computed } : { run: action.bound },
          );
        }
        get value() {
          return 1;
        }
        run() {
          return 1;
        }
      }
      class Next {
        get value() {
          return 2;
        }
        run() {
          return 2;
        }
      }
      const { instance, store, hot } = update(
        Old,
        Next,
        "import { ViewModelBase } from 'mobx-view-model'; export class VM extends ViewModelBase {}",
      );
      expect(hot.send).toHaveBeenCalledWith('mobx-view-model:full-reload');
      expect(instance.constructor).toBe(Old);
      expect(store.viewModelIdsByClasses.has(Old)).toBe(true);
    },
  );

  it('still updates ordinary prototype methods while preserving state', () => {
    class Old {
      count = 3;
      read() {
        return this.count;
      }
    }
    class Next {
      count = 0;
      read() {
        return this.count * 2;
      }
    }
    const { instance, store, hot } = update(
      Old,
      Next,
      "import { ViewModelBase } from 'mobx-view-model'; export class VM extends ViewModelBase {}",
    );
    expect(hot.send).not.toHaveBeenCalled();
    expect(instance.read()).toBe(6);
    expect(store.viewModelIdsByClasses.has(Next)).toBe(true);
  });

  it('does not partially update other stores before finding an unsafe instance', () => {
    class Old {
      read() {
        return 1;
      }
    }
    class Next {
      read() {
        return 2;
      }
    }
    const safe = new Old();
    const unsafe = Object.assign(new Old(), { callback: () => 1 });
    const stores = [safe, unsafe].map((instance) => ({
      viewModelIdsByClasses: new Map([[Old, ['vm']]]),
      linkedAnchorVMClasses: new Map([['anchor', Old]]),
      viewModels: new Map([['vm', instance]]),
    }));
    const hot = {
      data: { __vm_classes__: { VM: Old } },
      send: vi.fn(),
      dispose: vi.fn(),
    };
    new Function(
      'VM',
      'hot',
      'globalThis',
      '__vm_isObservableProp__',
      '__vm_isComputedProp__',
      generateHmrCode(['VM'])
        .slice(generateHmrCode(['VM']).indexOf('if (import.meta.hot)'))
        .replaceAll('import.meta.hot', 'hot'),
    )(
      Next,
      hot,
      { __MOBX_VM_PLUGIN_STORES__: stores },
      isObservableProp,
      isComputedProp,
    );
    expect(hot.send).toHaveBeenCalledOnce();
    for (const store of stores)
      expect(store.viewModelIdsByClasses.has(Old)).toBe(true);
    expect(safe.constructor).toBe(Old);
  });

  it('turns the client reload request into a Vite full-reload message', () => {
    const ws = { on: vi.fn(), off: vi.fn(), send: vi.fn() };
    const httpServer = { once: vi.fn() };
    (mobxVmVitePlugin().configureServer as Function)({ ws, httpServer });
    const [event, listener] = ws.on.mock.calls[0];
    expect(event).toBe('mobx-view-model:full-reload');
    listener();
    expect(ws.send).toHaveBeenCalledWith({ type: 'full-reload' });
    httpServer.once.mock.calls[0][1]();
    expect(ws.off).toHaveBeenCalledWith(event, listener);
  });
});

describe('source parsing', () => {
  it('does not insert displayName inside a call when a comment contains a closing parenthesis', () => {
    const result = transform(
      "import { observer } from 'mobx-react-lite';\nconst A = observer( // )\n () => null);",
      '/src/a.tsx',
    )!;
    const run = new Function(
      'observer',
      `${result.code.replace(/^import[^\n]+\n/, '')}\nreturn A;`,
    );
    expect(run((fn: Function) => fn).displayName).toBe('A');
  });

  it('adds displayName to components containing template literals', () => {
    const result = transform(
      `import { observer } from 'mobx-react-lite';\nconst A = observer(() => \`hello \${1 + 2}\`);`,
      '/src/a.tsx',
    );
    expect(result?.code).toContain('A.displayName = "A"');
  });

  it('ignores fake class declarations in comments and strings', () => {
    const result = transform(`import { ViewModelBase } from 'mobx-view-model';
// class Ghost extends ViewModelBase {}
export const example = 'class Phantom extends ViewModelBase {}';`);
    expect(result).toBeUndefined();
  });

  it('parses generic arrow functions in a .ts file without treating them as JSX', () => {
    const result = transform(`import { ViewModelBase } from 'mobx-view-model';
const identity = <T>(value: T) => value;
export class VM extends ViewModelBase {}`);
    expect(result?.code).toContain('const __vm_classes__ = { VM }');
  });
});

async function withFiles(
  files: Record<string, string>,
  run: (root: string) => Promise<void>,
) {
  const root = mkdtempSync(join(tmpdir(), 'mobx-vm-regression-'));
  for (const [name, code] of Object.entries(files))
    writeFileSync(join(root, name), code);
  try {
    await run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

describe('module analysis', () => {
  it('detects implements ViewModel in the real Vite transform pipeline', async () => {
    await withFiles(
      {
        'model.ts':
          "import type { ViewModel } from 'mobx-view-model'; export class VM implements ViewModel { id = 'vm'; }",
      },
      async (root) => {
        const server = await createServer({
          configFile: false,
          root,
          plugins: [mobxVmVitePlugin()],
          server: { middlewareMode: true, watch: null },
          optimizeDeps: { noDiscovery: true },
        });
        try {
          expect((await server.transformRequest('/model.ts'))?.code).toContain(
            '__vm_classes__',
          );
        } finally {
          await server.close();
        }
      },
    );
  });

  it('detects a derived class before its base has been transformed', async () => {
    await withFiles(
      {
        'base.ts':
          "import { ViewModelBase } from 'mobx-view-model'; export class Base extends ViewModelBase {}",
        'child.ts':
          "import { Base } from './base'; export class Child extends Base {}",
      },
      async (root) => {
        const code =
          "import { Base } from './base'; export class Child extends Base {}";
        expect(
          (mobxVmVitePlugin().transform as Function)(
            code,
            join(root, 'child.ts'),
          )?.code,
        ).toContain('__vm_classes__');
      },
    );
  });

  it('does not confuse an unrelated same-name import with a VM', () => {
    const plugin = mobxVmVitePlugin();
    (plugin.transform as Function)(
      "import { ViewModelBase } from 'mobx-view-model'; export class Base extends ViewModelBase {}",
      '/src/vm.ts',
    );
    const result = (plugin.transform as Function)(
      "import { Base } from 'unrelated-library'; export class Child extends Base {}",
      '/src/child.ts',
    );
    expect(result).toBeUndefined();
  });

  it('keeps consumers of same-name classes in separate modules', () => {
    const graph = new DependencyGraph();
    graph.addFile(
      '/a/view.tsx',
      [],
      [
        {
          vmClassName: 'VM',
          sourceFile: '/a/model.ts',
          usageType: 'useViewModel',
        },
      ],
    );
    graph.addFile(
      '/b/view.tsx',
      [],
      [
        {
          vmClassName: 'VM',
          sourceFile: '/b/model.ts',
          usageType: 'useViewModel',
        },
      ],
    );
    expect([...graph.getVmConsumers('VM', '/a/model.ts')]).toEqual([
      '/a/view.tsx',
    ]);
    expect([...graph.getVmConsumers('VM', '/b/model.ts')]).toEqual([
      '/b/view.tsx',
    ]);
  });

  it('follows default imports, re-exports and private fields across files', async () => {
    await withFiles(
      {
        'base.ts':
          "import { ViewModelBase as VMBase } from 'mobx-view-model'; export default class Base extends VMBase { #value = 1; }",
        'barrel.ts': "export { default as Renamed } from './base';",
        'child.ts':
          "import { Renamed as Parent } from './barrel'; export class Child extends Parent {}",
      },
      async (root) => {
        const code =
          "import { Renamed as Parent } from './barrel'; export class Child extends Parent {}";
        const result = (mobxVmVitePlugin().transform as Function)(
          code,
          join(root, 'child.ts'),
        );
        expect(result.code).toContain('const __vm_classes__ = { Child }');
        expect(result.code).toContain(
          'const __vm_private_classes__ = ["Child"]',
        );
      },
    );
  });
});
