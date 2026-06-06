import { describe, it, expect } from 'vitest';
import { DependencyGraph } from '../dependency-graph.js';
import type { VMClassInfo, VMUsageInfo } from '../types.js';

describe('DependencyGraph', () => {
  it('tracks VM exports per file', () => {
    const graph = new DependencyGraph();
    const classes: VMClassInfo[] = [
      { name: 'CounterVM', type: 'ViewModelBase', exportType: 'named' },
    ];

    graph.addFile('/src/counter/model.ts', classes, []);

    expect(graph.getVmExports('/src/counter/model.ts')).toEqual(classes);
    expect(graph.isVmFile('/src/counter/model.ts')).toBe(true);
  });

  it('tracks VM source file by class name', () => {
    const graph = new DependencyGraph();
    const classes: VMClassInfo[] = [
      { name: 'CounterVM', type: 'ViewModelBase', exportType: 'named' },
    ];

    graph.addFile('/src/counter/model.ts', classes, []);

    expect(graph.getVmSourceFile('CounterVM')).toBe('/src/counter/model.ts');
  });

  it('returns VM type by class name', () => {
    const graph = new DependencyGraph();
    const classes: VMClassInfo[] = [
      { name: 'CounterVM', type: 'ViewModelBase', exportType: 'named' },
      { name: 'SimpleVM', type: 'ViewModelSimple', exportType: 'named' },
    ];

    graph.addFile('/src/model.ts', classes, []);

    expect(graph.getVmType('CounterVM')).toBe('ViewModelBase');
    expect(graph.getVmType('SimpleVM')).toBe('ViewModelSimple');
    expect(graph.getVmType('UnknownVM')).toBeUndefined();
  });

  it('tracks VM consumers via usage', () => {
    const graph = new DependencyGraph();
    const classes: VMClassInfo[] = [
      { name: 'CounterVM', type: 'ViewModelBase', exportType: 'named' },
    ];
    const usages: VMUsageInfo[] = [
      { vmClassName: 'CounterVM', usageType: 'useViewModel' },
    ];

    graph.addFile('/src/counter/model.ts', classes, []);
    graph.addFile('/src/counter/view.tsx', [], usages);

    const consumers = graph.getVmConsumers('CounterVM');
    expect(consumers.has('/src/counter/view.tsx')).toBe(true);
  });

  it('cleans up old entries on re-add', () => {
    const graph = new DependencyGraph();
    const classes: VMClassInfo[] = [
      { name: 'CounterVM', type: 'ViewModelBase', exportType: 'named' },
    ];

    graph.addFile('/src/model.ts', classes, []);
    expect(graph.isVmFile('/src/model.ts')).toBe(true);

    // Re-add with no classes
    graph.addFile('/src/model.ts', [], []);
    expect(graph.isVmFile('/src/model.ts')).toBe(false);
    expect(graph.getVmSourceFile('CounterVM')).toBeUndefined();
  });

  it('removes consumer mapping when file is re-added', () => {
    const graph = new DependencyGraph();
    const usages: VMUsageInfo[] = [
      { vmClassName: 'CounterVM', usageType: 'useViewModel' },
    ];

    graph.addFile('/src/view.tsx', [], usages);
    expect(graph.getVmConsumers('CounterVM').has('/src/view.tsx')).toBe(true);

    // Re-add with no usages
    graph.addFile('/src/view.tsx', [], []);
    expect(graph.getVmConsumers('CounterVM').has('/src/view.tsx')).toBe(false);
  });

  it('handles multiple consumers for same VM class', () => {
    const graph = new DependencyGraph();
    const classes: VMClassInfo[] = [
      { name: 'CounterVM', type: 'ViewModelBase', exportType: 'named' },
    ];

    graph.addFile('/src/model.ts', classes, []);
    graph.addFile(
      '/src/view1.tsx',
      [],
      [{ vmClassName: 'CounterVM', usageType: 'useViewModel' }],
    );
    graph.addFile(
      '/src/view2.tsx',
      [],
      [{ vmClassName: 'CounterVM', usageType: 'withViewModel' }],
    );

    const consumers = graph.getVmConsumers('CounterVM');
    expect(consumers.size).toBe(2);
    expect(consumers.has('/src/view1.tsx')).toBe(true);
    expect(consumers.has('/src/view2.tsx')).toBe(true);
  });
});
