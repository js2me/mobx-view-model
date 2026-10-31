import { expect, it } from 'vitest';
import type { AnyVM } from './types';
import { ViewModelTree } from './view-model-tree';

it('indexes deep trees and breaks disconnected cycles without recursion', () => {
  const vms = Array.from({ length: 20000 }, () => ({}) as AnyVM);
  for (let index = 1; index < vms.length; index++)
    vms[index].parentViewModel = vms[index - 1];
  let tree = new ViewModelTree(vms);
  expect(tree.roots).toEqual([vms[0]]);
  expect(tree.parents.size).toBe(19999);
  vms[0].parentViewModel = vms.at(-1);
  tree = new ViewModelTree(vms);
  expect(tree.roots).toHaveLength(1);
  expect(tree.parents.size).toBe(19999);
  const orphan = { parentViewModel: {} } as AnyVM;
  const self = {} as AnyVM;
  self.parentViewModel = self;
  expect(new ViewModelTree([orphan, self]).roots).toEqual([orphan, self]);
});
