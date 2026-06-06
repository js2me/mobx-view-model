import { describe, it, expect } from 'vitest';
import {
  detectViewModelClasses,
  extractImportBindings,
} from '../detect-vm-classes.js';
import type { ImportedVmClass } from '../detect-vm-classes.js';

describe('detectViewModelClasses', () => {
  it('detects class extending ViewModelBase', () => {
    const code = `
import { ViewModelBase } from 'mobx-view-model';

export class CounterVM extends ViewModelBase {
  clicks = 0;
}`;
    const result = detectViewModelClasses(code);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('CounterVM');
    expect(result[0].type).toBe('ViewModelBase');
    expect(result[0].exportType).toBe('named');
  });

  it('detects class implementing ViewModel', () => {
    const code = `
import type { ViewModel } from 'mobx-view-model';

export class MyVM implements ViewModel {
  id = 'test';
}`;
    const result = detectViewModelClasses(code);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('MyVM');
    expect(result[0].type).toBe('ViewModel');
  });

  it('detects class implementing ViewModelSimple', () => {
    const code = `
import { ViewModelSimple } from 'mobx-view-model';

class SimpleVM implements ViewModelSimple {
  id = 'simple';
}`;
    const result = detectViewModelClasses(code);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('SimpleVM');
    expect(result[0].type).toBe('ViewModelSimple');
  });

  it('detects indirect inheritance within same file', () => {
    const code = `
import { ViewModelBase } from 'mobx-view-model';

export class BaseVM extends ViewModelBase {}

export class ChildVM extends BaseVM {}`;
    const result = detectViewModelClasses(code);
    expect(result).toHaveLength(2);
    expect(result.map((c) => c.name)).toContain('BaseVM');
    expect(result.map((c) => c.name)).toContain('ChildVM');
  });

  it('detects default export class', () => {
    const code = `
import { ViewModelBase } from 'mobx-view-model';

export default class MyVM extends ViewModelBase {}`;
    const result = detectViewModelClasses(code);
    expect(result).toHaveLength(1);
    expect(result[0].exportType).toBe('default');
  });

  it('detects re-exported class', () => {
    const code = `
import { ViewModelBase } from 'mobx-view-model';

class MyVM extends ViewModelBase {}

export { MyVM };`;
    const result = detectViewModelClasses(code);
    expect(result).toHaveLength(1);
    expect(result[0].exportType).toBe('named');
  });

  it('returns empty for files without mobx-view-model import and empty importedVmClasses', () => {
    const code = `
class CounterVM extends ViewModelBase {
  clicks = 0;
}`;
    const result = detectViewModelClasses(code);
    expect(result).toHaveLength(0);
  });

  it('detects multiple ViewModel classes in one file', () => {
    const code = `
import { ViewModelBase } from 'mobx-view-model';

export class CounterVM extends ViewModelBase {}
export class UserVM extends ViewModelBase {}`;
    const result = detectViewModelClasses(code);
    expect(result).toHaveLength(2);
    expect(result.map((c) => c.name)).toEqual(['CounterVM', 'UserVM']);
  });

  it('detects class from mobx-view-model/react import', () => {
    const code = `
import { ViewModelBase } from 'mobx-view-model/react';

export class MyVM extends ViewModelBase {}`;
    const result = detectViewModelClasses(code);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('MyVM');
  });

  it('detects class extending ViewModelSimple', () => {
    const code = `
import { ViewModelSimple } from 'mobx-view-model';

export class SimpleVM extends ViewModelSimple {
  id = 'simple';
}`;
    const result = detectViewModelClasses(code);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('SimpleVM');
    expect(result[0].type).toBe('ViewModelSimple');
  });

  it('detects cross-file inheritance via importedVmClasses', () => {
    const code = `
import { ViewModelBase } from 'mobx-view-model';
import { BaseVM } from './model';

export class ChildVM extends BaseVM {}`;
    const importedVmClasses: ImportedVmClass[] = [
      { localName: 'BaseVM', type: 'ViewModelBase' },
    ];
    const result = detectViewModelClasses(code, importedVmClasses);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('ChildVM');
    expect(result[0].type).toBe('ViewModelBase');
  });

  it('detects cross-file inheritance with aliased import', () => {
    const code = `
import { ViewModelBase } from 'mobx-view-model';
import { BaseVM as MyVM } from './model';

export class ChildVM extends MyVM {}`;
    const importedVmClasses: ImportedVmClass[] = [
      { localName: 'MyVM', type: 'ViewModelBase' },
    ];
    const result = detectViewModelClasses(code, importedVmClasses);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('ChildVM');
    expect(result[0].type).toBe('ViewModelBase');
  });

  it('detects cross-file inheritance with ViewModelSimple type', () => {
    const code = `
import { ViewModelBase } from 'mobx-view-model';
import { SimpleBase } from './model';

export class ChildVM extends SimpleBase {}`;
    const importedVmClasses: ImportedVmClass[] = [
      { localName: 'SimpleBase', type: 'ViewModelSimple' },
    ];
    const result = detectViewModelClasses(code, importedVmClasses);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('ChildVM');
    expect(result[0].type).toBe('ViewModelSimple');
  });

  it('does not detect cross-file inheritance when importedVmClasses is empty', () => {
    const code = `
import { ViewModelBase } from 'mobx-view-model';
import { BaseVM } from './model';

export class ChildVM extends BaseVM {}`;
    const result = detectViewModelClasses(code);
    expect(result).toHaveLength(0);
  });

  it('combines same-file and cross-file indirect inheritance', () => {
    const code = `
import { ViewModelBase } from 'mobx-view-model';
import { RemoteVM } from './model';

export class LocalVM extends ViewModelBase {}
export class LocalChild extends LocalVM {}
export class RemoteChild extends RemoteVM {}`;
    const importedVmClasses: ImportedVmClass[] = [
      { localName: 'RemoteVM', type: 'ViewModelBase' },
    ];
    const result = detectViewModelClasses(code, importedVmClasses);
    expect(result).toHaveLength(3);
    expect(result.map((c) => c.name)).toEqual([
      'LocalVM',
      'LocalChild',
      'RemoteChild',
    ]);
  });

  it('detects VM class without mobx-view-model import when importedVmClasses is provided', () => {
    const code = `
import { BaseVM } from './model';

export class ChildVM extends BaseVM {}`;
    const importedVmClasses: ImportedVmClass[] = [
      { localName: 'BaseVM', type: 'ViewModelBase' },
    ];
    const result = detectViewModelClasses(code, importedVmClasses);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('ChildVM');
    expect(result[0].type).toBe('ViewModelBase');
  });

  it('detects VM class with aliased import and no mobx-view-model import', () => {
    const code = `
import { BaseVM as MyVM } from './model';

export class ChildVM extends MyVM {}`;
    const importedVmClasses: ImportedVmClass[] = [
      { localName: 'MyVM', type: 'ViewModelSimple' },
    ];
    const result = detectViewModelClasses(code, importedVmClasses);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('ChildVM');
    expect(result[0].type).toBe('ViewModelSimple');
  });

  it('returns empty for files without mobx-view-model import and no importedVmClasses', () => {
    const code = `
import { SomeClass } from './model';

export class ChildVM extends SomeClass {}`;
    const result = detectViewModelClasses(code);
    expect(result).toHaveLength(0);
  });
});

describe('extractImportBindings', () => {
  it('extracts named imports', () => {
    const code = `import { Foo, Bar } from './module';`;
    const bindings = extractImportBindings(code);
    expect(bindings).toEqual([
      { localName: 'Foo', importedName: 'Foo', source: './module' },
      { localName: 'Bar', importedName: 'Bar', source: './module' },
    ]);
  });

  it('extracts aliased imports', () => {
    const code = `import { BaseVM as MyVM } from './model';`;
    const bindings = extractImportBindings(code);
    expect(bindings).toEqual([
      { localName: 'MyVM', importedName: 'BaseVM', source: './model' },
    ]);
  });

  it('extracts default imports', () => {
    const code = `import MyDefault from './module';`;
    const bindings = extractImportBindings(code);
    expect(bindings).toEqual([
      { localName: 'MyDefault', importedName: 'default', source: './module' },
    ]);
  });

  it('extracts mixed named and aliased imports', () => {
    const code = `import { A, B as C } from './module';`;
    const bindings = extractImportBindings(code);
    expect(bindings).toEqual([
      { localName: 'A', importedName: 'A', source: './module' },
      { localName: 'C', importedName: 'B', source: './module' },
    ]);
  });
});
