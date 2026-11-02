import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  action,
  computed,
  isComputedProp,
  isObservableProp,
  makeObservable,
  observable,
} from 'mobx';
import { normalizePath } from 'vite';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ViewModelBase } from '../../../core/src/view-model/view-model.base.js';
import { detectObserverCalls } from '../detect-observer.js';
import { generateHmrCode } from '../hmr-runtime.js';
import { mobxVmVitePlugin } from '../index.js';
import { ModuleAnalysis } from '../module-analysis.js';

vi.mock('node:path', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:path')>();
  return { ...actual, resolve: vi.fn(actual.resolve) };
});

afterEach(() => {
  vi.mocked(resolve).mockReset();
});

function runUpdate(Old: any, Next: any, instance: any, names = ['VM']) {
  const store = {
    viewModelIdsByClasses: new Map([[Old, ['vm']]]),
    linkedAnchorVMClasses: new Map([['anchor', Old]]),
    viewModels: new Map([['vm', instance]]),
  };
  const hot = {
    data: { __vm_classes__: { VM: Old } },
    send: vi.fn(),
    dispose: vi.fn(),
  };
  const code = generateHmrCode(names)
    .slice(generateHmrCode(names).indexOf('if (import.meta.hot)'))
    .replaceAll('import.meta.hot', 'hot');
  new Function(
    names[0],
    'hot',
    'globalThis',
    '__vm_isObservableProp__',
    '__vm_isComputedProp__',
    code,
  )(
    Next,
    hot,
    { __MOBX_VM_PLUGIN_STORES__: [store] },
    isObservableProp,
    isComputedProp,
  );
  return { hot, store };
}

describe('review regressions', () => {
  it('preserves a real ViewModelBase instance during an ordinary method update', () => {
    class Old extends ViewModelBase {
      count = 3;
      constructor() {
        super({ id: 'vm', payload: {} });
        observable(this, 'count');
        makeObservable(this);
      }
      read() {
        return this.count;
      }
    }
    class Next extends ViewModelBase {
      read() {
        return (this as any).count * 2;
      }
    }
    const instance = new Old();
    const { hot, store } = runUpdate(Old, Next, instance);
    expect(hot.send).not.toHaveBeenCalled();
    expect(instance.read()).toBe(6);
    expect(instance.payload).toEqual({});
    expect(instance.isMounted).toBe(false);
    expect(store.viewModelIdsByClasses.has(Next)).toBe(true);
  });

  it('keeps unchanged base computed properties and bound actions', () => {
    class Base {
      count = 3;
      constructor() {
        makeObservable(this, {
          count: observable,
          value: computed,
          run: action.bound,
        });
      }
      get value() {
        return this.count;
      }
      run() {
        return this.count;
      }
    }
    class Old extends Base {
      read() {
        return this.count;
      }
    }
    class Next extends Base {
      read() {
        return this.count * 2;
      }
    }
    const instance = new Old();
    const { hot } = runUpdate(Old, Next, instance);
    expect(hot.send).not.toHaveBeenCalled();
    expect(instance.read()).toBe(6);
    expect(instance.value).toBe(3);
    expect(instance.run()).toBe(3);
  });

  it('reloads non-extensible instances without modifying them', () => {
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
    const instance = Object.preventExtensions(new Old());
    const { hot } = runUpdate(Old, Next, instance);
    expect(hot.send).toHaveBeenCalledWith('mobx-view-model:full-reload');
    expect(instance.constructor).toBe(Old);
  });

  it('reloads when an existing VM class is renamed', () => {
    class Old {}
    class Renamed {}
    const { hot, store } = runUpdate(Old, Renamed, new Old(), ['Renamed']);
    expect(hot.send).toHaveBeenCalledWith('mobx-view-model:full-reload');
    expect(store.viewModelIdsByClasses.has(Old)).toBe(true);
  });

  it('detects default observer imports from configured sources', () => {
    expect(
      detectObserverCalls(
        "import observe from 'custom-observer'; const Header = observe(() => null);",
        ['custom-observer'],
      ).map((call) => call.varName),
    ).toEqual(['Header']);
    expect(
      detectObserverCalls(
        "import type observe from 'custom-observer'; const Header = observe(() => null);",
        ['custom-observer'],
      ),
    ).toEqual([]);
  });

  it('follows a default export forwarding an imported VM for inheritance and consumers', () => {
    const root = mkdtempSync(join(tmpdir(), 'vm-default-forward-'));
    try {
      writeFileSync(
        join(root, 'base.ts'),
        "import { ViewModelBase } from 'mobx-view-model'; export default class Base extends ViewModelBase {}",
      );
      writeFileSync(
        join(root, 'barrel.ts'),
        "import Base from './base'; export default Base;",
      );
      const analysis = new ModuleAnalysis();
      const code =
        "import Parent from './barrel'; export class Child extends Parent {}";
      expect(analysis.importedClasses(code, join(root, 'child.ts'))).toEqual([
        { localName: 'Parent', type: 'ViewModelBase' },
      ]);
      expect(
        analysis.resolveUsages(
          "import Parent from './barrel';",
          join(root, 'view.tsx'),
          [{ vmClassName: 'Parent', usageType: 'useViewModel' }],
        ),
      ).toEqual([
        {
          vmClassName: 'Base',
          usageType: 'useViewModel',
          sourceFile: normalizePath(join(root, 'base.ts')),
        },
      ]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('normalizes native resolved paths before recording consumer identity', () => {
    const root = mkdtempSync(join(tmpdir(), 'vm-windows-path-'));
    try {
      writeFileSync(
        join(root, 'base.ts'),
        "import { ViewModelBase } from 'mobx-view-model'; export class Base extends ViewModelBase {}",
      );
      vi.mocked(resolve).mockImplementation((...paths) =>
        join(...paths).replaceAll('/', '\\'),
      );
      const analysis = new ModuleAnalysis();
      expect(
        analysis.resolveUsages(
          "import { Base } from './base';",
          join(root, 'view.tsx'),
          [{ vmClassName: 'Base', usageType: 'useViewModel' }],
        ),
      ).toEqual([
        {
          vmClassName: 'Base',
          usageType: 'useViewModel',
          sourceFile: normalizePath(join(root, 'base.ts')),
        },
      ]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('reloads when the final VM declaration is removed from a module', async () => {
    const root = mkdtempSync(join(tmpdir(), 'vm-removed-class-'));
    try {
      const file = join(root, 'model.ts');
      const plugin = mobxVmVitePlugin();
      (plugin.transform as Function)(
        "import { ViewModelBase } from 'mobx-view-model'; export class VM extends ViewModelBase {}",
        file,
      );
      writeFileSync(file, 'export const removed = true;');
      const ws = { send: vi.fn() };
      await (plugin.handleHotUpdate as Function)({
        file,
        modules: [],
        server: { ws },
      });
      expect(ws.send).toHaveBeenCalledWith({ type: 'full-reload' });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
