import { describe, it, expect } from 'vitest';
import { mobxVmVitePlugin } from '../index.js';

describe('mobxVmVitePlugin', () => {
  it('returns a Vite plugin with correct name', () => {
    const plugin = mobxVmVitePlugin();
    expect(plugin.name).toBe('mobx-view-model-vite-plugin');
  });

  it('has required hooks', () => {
    const plugin = mobxVmVitePlugin();
    expect(typeof plugin.resolveId).toBe('function');
    expect(typeof plugin.load).toBe('function');
    expect(typeof plugin.transform).toBe('function');
  });

  it('resolves virtual runtime module', () => {
    const plugin = mobxVmVitePlugin();
    const resolved = plugin.resolveId!(
      '\0mobx-view-model-vite-plugin/runtime' as any,
      '',
      {},
    );
    expect(resolved).toBe('\0mobx-view-model-vite-plugin/runtime');
  });

  it('loads virtual runtime module source', () => {
    const plugin = mobxVmVitePlugin();
    const source = plugin.load!('\0mobx-view-model-vite-plugin/runtime' as any);
    expect(source).toContain('viewModelsConfig');
    expect(source).toContain('__MOBX_VM_PLUGIN_STORES__');
  });

  it('does not transform non-TS files', () => {
    const plugin = mobxVmVitePlugin();
    const result = plugin.transform!('const x = 1;', 'style.css');
    expect(result).toBeUndefined();
  });

  it('does not transform files without mobx imports', () => {
    const plugin = mobxVmVitePlugin();
    const result = plugin.transform!(
      'const x = useViewModel();',
      '/src/app.tsx',
    );
    expect(result).toBeUndefined();
  });

  it('injects HMR code into ViewModel class files', () => {
    const plugin = mobxVmVitePlugin();
    const code = `
import { ViewModelBase } from 'mobx-view-model';

export class CounterVM extends ViewModelBase {
  clicks = 0;
}`;
    const result = plugin.transform!(code, '/src/counter/model.ts') as any;
    expect(result).toBeDefined();
    expect(result.code).toContain('import.meta.hot');
    expect(result.code).toContain('__vm_classes__');
    expect(result.code).toContain('CounterVM');
  });

  it('injects displayName for observer components', () => {
    const plugin = mobxVmVitePlugin();
    const code = `
import { observer } from 'mobx-react-lite';

const Header = observer(() => {
  return <div>Hello</div>;
});
`;
    const result = plugin.transform!(code, '/src/header.tsx') as any;
    expect(result).toBeDefined();
    expect(result.code).toContain('Header.displayName = "Header"');
  });

  it('injects both HMR and displayName when both apply', () => {
    const plugin = mobxVmVitePlugin();
    const code = `
import { ViewModelBase } from 'mobx-view-model';
import { observer } from 'mobx-react-lite';
import { useViewModel } from 'mobx-view-model-react';

export class CounterVM extends ViewModelBase {}

const CounterView = observer(() => {
  const model = useViewModel(CounterVM);
  return <div>{model.clicks}</div>;
});
`;
    const result = plugin.transform!(code, '/src/counter.tsx') as any;
    expect(result).toBeDefined();
    expect(result.code).toContain('import.meta.hot');
    expect(result.code).toContain('CounterView.displayName = "CounterView"');
  });

  it('does not inject HMR when option is disabled', () => {
    const plugin = mobxVmVitePlugin({ hmr: false });
    const code = `
import { ViewModelBase } from 'mobx-view-model';

export class CounterVM extends ViewModelBase {}
`;
    const result = plugin.transform!(code, '/src/model.ts') as any;
    // With hmr:false and autoDisplayName:true, the file still imports
    // from mobx-view-model but has no observer calls, so nothing to inject
    expect(result).toBeUndefined();
  });

  it('does not inject displayName when option is disabled', () => {
    const plugin = mobxVmVitePlugin({ autoDisplayName: false });
    const code = `
import { observer } from 'mobx-react-lite';

const Header = observer(() => <div />);
`;
    // With autoDisplayName:false and hmr:true, no VM classes detected
    // and no observer injection, so nothing to inject
    const result = plugin.transform!(code, '/src/header.tsx') as any;
    expect(result).toBeUndefined();
  });

  it('loads runtime with devtools when devtools option is true', () => {
    const plugin = mobxVmVitePlugin({ devtools: true });
    const source = plugin.load!('\0mobx-view-model-vite-plugin/runtime' as any);
    expect(source).toContain('ViewModelDevtools');
    expect(source).toContain("from 'mobx-view-model-devtools'");
  });

  it('loads runtime with devtools config when object is provided', () => {
    const plugin = mobxVmVitePlugin({
      devtools: { position: 'bottom-left', defaultIsOpened: true },
    });
    const source = plugin.load!('\0mobx-view-model-vite-plugin/runtime' as any);
    expect(source).toContain('"bottom-left"');
    expect(source).toContain('ViewModelDevtools');
  });

  it('loads runtime without devtools by default', () => {
    const plugin = mobxVmVitePlugin();
    const source = plugin.load!('\0mobx-view-model-vite-plugin/runtime' as any);
    expect(source).not.toContain('ViewModelDevtools');
  });

  it('injects runtime import when devtools is enabled even without HMR', () => {
    const plugin = mobxVmVitePlugin({ hmr: false, devtools: true });
    const code = `
import { ViewModelBase } from 'mobx-view-model';

export class CounterVM extends ViewModelBase {}
`;
    const result = plugin.transform!(code, '/src/model.ts') as any;
    expect(result).toBeDefined();
    expect(result.code).toContain('mobx-view-model-vite-plugin/runtime');
    // No HMR code since hmr is false
    expect(result.code).not.toContain('import.meta.hot');
  });

  // --- observerSources ---

  it('injects displayName for observer from mobx-react', () => {
    const plugin = mobxVmVitePlugin();
    const code = `
import { observer } from 'mobx-react';

const Header = observer(() => {
  return <div>Hello</div>;
});
`;
    const result = plugin.transform!(code, '/src/header.tsx') as any;
    expect(result).toBeDefined();
    expect(result.code).toContain('Header.displayName = "Header"');
  });

  it('injects displayName for observer from mobx-react-lite', () => {
    const plugin = mobxVmVitePlugin();
    const code = `
import { observer } from 'mobx-react-lite';

const Header = observer(() => <div />);
`;
    const result = plugin.transform!(code, '/src/header.tsx') as any;
    expect(result).toBeDefined();
    expect(result.code).toContain('Header.displayName = "Header"');
  });

  it('respects custom observerSources option', () => {
    const plugin = mobxVmVitePlugin({
      observerSources: ['custom-observer-lib'],
    });
    const code = `
import { observer } from 'custom-observer-lib';

const Header = observer(() => <div />);
`;
    const result = plugin.transform!(code, '/src/header.tsx') as any;
    expect(result).toBeDefined();
    expect(result.code).toContain('Header.displayName = "Header"');
  });

  it('ignores observer from non-configured source', () => {
    const plugin = mobxVmVitePlugin({ observerSources: ['mobx-react-lite'] });
    const code = `
import { observer } from 'mobx-react';

const Header = observer(() => <div />);
`;
    const result = plugin.transform!(code, '/src/header.tsx') as any;
    expect(result).toBeUndefined();
  });

  // --- Cross-file VM class inheritance ---

  it('detects ViewModel class that extends imported VM class without direct mobx-view-model import', () => {
    const plugin = mobxVmVitePlugin();

    // First, process the base file so the dependency graph knows about CounterVM
    const baseCode = `
import { ViewModelBase } from 'mobx-view-model';

export class CounterVM extends ViewModelBase {
  count = 0;
}
`;
    plugin.transform!(baseCode, '/src/counter/base.ts');

    // Now process a file that extends CounterVM without importing from mobx-view-model
    const derivedCode = `
import { CounterVM } from './base';

export class ExtendedVM extends CounterVM {
  extra = true;
}
`;
    const result = plugin.transform!(
      derivedCode,
      '/src/counter/extended.ts',
    ) as any;
    expect(result).toBeDefined();
    expect(result.code).toContain('import.meta.hot');
    expect(result.code).toContain('ExtendedVM');
  });
});
