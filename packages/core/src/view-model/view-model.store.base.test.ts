import type { Mock } from 'vitest';
import { describe, expect, it, vi } from 'vitest';

import type { Maybe } from 'yummies/types';
import type { ViewModelsConfig } from '../config/types.js';
import { ViewModelBaseMock } from './view-model.base.test.js';
import { ViewModelStoreBase } from './view-model.store.base.js';
import type {
  ViewModelGenerateIdConfig,
  ViewModelLookup,
} from './view-model.store.types.js';
import type {
  AnyViewModel,
  AnyViewModelSimple,
} from './view-model.types.js';

export class ViewModelStoreBaseMock extends ViewModelStoreBase {
  spies: {
    generateId: Mock<
      (config: ViewModelGenerateIdConfig<AnyViewModel | AnyViewModelSimple>) => string
    >;
    get: Mock<
      (
        vmLookup: Maybe<ViewModelLookup<AnyViewModel | AnyViewModelSimple>>,
      ) => AnyViewModel | AnyViewModelSimple | null
    >;
  } = {
    generateId: vi.fn(),
    get: vi.fn(),
  };

  get _viewModels() {
    return this.viewModels;
  }
  get _linkedAnchorVMClasses() {
    return this.linkedAnchorVMClasses;
  }
  get _viewModelIdsByClasses() {
    return this.viewModelIdsByClasses;
  }
  get _stagedViewModels() {
    return this.stagedViewModels;
  }

  generateId<VM extends AnyViewModel | AnyViewModelSimple>(
    config: ViewModelGenerateIdConfig<VM>,
  ): string {
    const result = super.generateId(config);
    this.spies.generateId.mockReturnValue(result)(config as any);
    return result;
  }

  get<T extends AnyViewModel | AnyViewModelSimple>(
    vmLookup: Maybe<ViewModelLookup<T>>,
  ): T | null {
    const result = super.get<T>(vmLookup);
    this.spies.get.mockReturnValue(result)(vmLookup);
    return result;
  }
}

describe('ViewModelStoreBase', () => {
  it('has clean method', () => {
    const vmStore = new ViewModelStoreBaseMock();
    expect(vmStore.clean).toBeDefined();
  });

  it('has define / create / unmount methods', () => {
    const vmStore = new ViewModelStoreBaseMock();
    expect(vmStore.define).toBeDefined();
    expect(vmStore.create).toBeDefined();
    expect(vmStore.unmount).toBeDefined();
  });

  it('create instance', () => {
    const vmStore = new ViewModelStoreBaseMock();
    expect(vmStore).toBeDefined();
  });

  it('define registers and returns the view model', () => {
    const vmStore = new ViewModelStoreBaseMock();
    const vm = vmStore.define({
      id: '1',
      VM: ViewModelBaseMock,
      payload: {},
    });

    expect(vmStore.get('1')).toBe(vm);
    expect(vm.id).toBe('1');
  });

  it('define calls init for ViewModelBase', () => {
    const vmStore = new ViewModelStoreBaseMock();
    const vm = vmStore.define({
      id: '1',
      VM: ViewModelBaseMock,
      payload: {},
    });

    expect(vm.spies.init).toBeCalledTimes(1);
    expect(vm.spies.init.mock.calls[0]![0]).toMatchObject({
      id: '1',
      viewModels: vmStore,
    });
  });

  it('define returns existing instance for the same id', () => {
    const vmStore = new ViewModelStoreBaseMock();
    const first = vmStore.define({
      id: 'shared',
      VM: ViewModelBaseMock,
      payload: {},
    });
    const second = vmStore.define({
      id: 'shared',
      VM: ViewModelBaseMock,
      payload: {},
    });

    expect(second).toBe(first);
    expect([...vmStore._viewModels.values()]).toHaveLength(1);
  });

  it('unmount unmounts and removes the view model', () => {
    const vmStore = new ViewModelStoreBaseMock();
    const vm = vmStore.define({
      id: '1',
      VM: ViewModelBaseMock,
      payload: {},
    });
    vm.mount();

    vmStore.unmount(vm);

    expect(vmStore.get('1')).toBe(null);
    expect(vm.isMounted).toBe(false);
  });

  it('re-define after unmount creates a fresh instance', () => {
    const vmStore = new ViewModelStoreBaseMock();
    const first = vmStore.define({
      id: 'demo',
      VM: ViewModelBaseMock,
      payload: {},
    });
    first.mount();
    expect(first.spies.willMount).toHaveBeenCalledTimes(1);

    vmStore.unmount(first);
    expect(vmStore.get('demo')).toBe(null);

    const second = vmStore.define({
      id: 'demo',
      VM: ViewModelBaseMock,
      payload: {},
    });
    second.mount();

    expect(second).not.toBe(first);
    expect(second.spies.willMount).toHaveBeenCalledTimes(1);
    expect(vmStore.get('demo')).toBe(second);
  });

  it('mountedViewsCount counts mounted view models', () => {
    const vmStore = new ViewModelStoreBaseMock();
    const a = vmStore.define({ id: '1', VM: ViewModelBaseMock, payload: {} });
    const b = vmStore.define({ id: '2', VM: ViewModelBaseMock, payload: {} });
    const c = vmStore.define({ id: '3', VM: ViewModelBaseMock, payload: {} });

    expect(vmStore.mountedViewsCount).toBe(0);

    a.mount();
    b.mount();
    expect(vmStore.mountedViewsCount).toBe(2);

    c.mount();
    expect(vmStore.mountedViewsCount).toBe(3);
  });

  it('parentViewModel is available via constructor params', () => {
    class VMParent extends ViewModelBaseMock {}
    class VMChild extends ViewModelBaseMock<any, VMParent> {}

    const vmStore = new ViewModelStoreBaseMock();
    const parentVM = vmStore.define({
      id: 'parent',
      VM: VMParent,
      payload: {},
    }) as VMParent;

    const childVM = vmStore.define({
      id: 'child',
      VM: VMChild,
      payload: {},
      parentViewModel: parentVM,
      viewModels: vmStore,
    }) as VMChild;

    expect(childVM.parentViewModel).toBe(parentVM);
    expect(childVM.parentViewModel.id).toBe('parent');
  });

  it('able to get access to view model by id', () => {
    const vmStore = new ViewModelStoreBaseMock();
    const vm = vmStore.define({
      id: 'by-id',
      VM: ViewModelBaseMock,
      payload: {},
    });

    expect(vmStore.get(vm.id)).toBe(vm);
  });

  it('able to get access to view model by Class', () => {
    const vmStore = new ViewModelStoreBaseMock();

    class MyVM extends ViewModelBaseMock {}
    const vm = vmStore.define({ id: 'cls', VM: MyVM, payload: {} });

    expect(vmStore.get(MyVM)).toBe(vm);
  });

  it('able to get instance id by id (getId method)', () => {
    const vmStore = new ViewModelStoreBaseMock();
    const vm = vmStore.define({
      id: 'get-id',
      VM: ViewModelBaseMock,
      payload: {},
    });

    expect(vmStore.getId(vm.id)).toBe(vm.id);
  });

  it('able to get instance id by Class (getId method)', () => {
    const vmStore = new ViewModelStoreBaseMock();

    class MyVM extends ViewModelBaseMock {}
    const vm = vmStore.define({ id: 'get-cls', VM: MyVM, payload: {} });

    expect(vmStore.getId(MyVM)).toBe(vm.id);
  });

  it('bug with overriding observable after create second store', () => {
    new ViewModelStoreBase({
      vmConfig: {
        observable: {
          viewModelStores: { useDecorators: false },
          viewModels: { useDecorators: false },
        },
      },
    });
    const vmStore2 = new ViewModelStoreBaseMock();

    const vmConfig = (vmStore2 as any).vmConfig as ViewModelsConfig;

    expect(vmConfig.observable.viewModelStores.useDecorators).toBe(true);
    expect(vmConfig.observable.viewModels.useDecorators).toBe(true);
  });

  describe('staging (defineStaged / commitStaged / dropStaged)', () => {
    it('defineStaged creates an instance visible to lookups but not committed', () => {
      const vmStore = new ViewModelStoreBaseMock();
      const owner = {};

      const vm = vmStore.defineStaged(
        { id: 'staged', VM: ViewModelBaseMock, payload: {} },
        owner,
      );

      // read-through: lookups see the staged instance
      expect(vmStore.get('staged')).toBe(vm);
      expect(vmStore.has('staged')).toBe(true);
      expect(vmStore.get(ViewModelBaseMock)).toBe(vm);
      expect(vmStore.getIds(ViewModelBaseMock)).toContain('staged');

      // but it is not a committed store member
      expect(vmStore._viewModels.has('staged')).toBe(false);
      expect(vmStore._stagedViewModels.has('staged')).toBe(true);
    });

    it('defineStaged calls init with the store', () => {
      const vmStore = new ViewModelStoreBaseMock();

      const vm = vmStore.defineStaged(
        { id: 'init', VM: ViewModelBaseMock, payload: {} },
        {},
      );

      expect(vm.spies.init).toBeCalledTimes(1);
      expect(vm.spies.init.mock.calls[0]![0]).toMatchObject({
        id: 'init',
        viewModels: vmStore,
      });
    });

    it('defineStaged returns the existing staged instance for the same id', () => {
      const vmStore = new ViewModelStoreBaseMock();

      const first = vmStore.defineStaged(
        { id: 'shared', VM: ViewModelBaseMock, payload: {} },
        {},
      );
      const second = vmStore.defineStaged(
        { id: 'shared', VM: ViewModelBaseMock, payload: {} },
        {},
      );

      expect(second).toBe(first);
      expect(vmStore._stagedViewModels.size).toBe(1);
    });

    it('defineStaged returns the committed instance for the same id', () => {
      const vmStore = new ViewModelStoreBaseMock();

      const committed = vmStore.define({
        id: 'shared',
        VM: ViewModelBaseMock,
        payload: {},
      });
      const staged = vmStore.defineStaged(
        { id: 'shared', VM: ViewModelBaseMock, payload: {} },
        {},
      );

      expect(staged).toBe(committed);
      expect(vmStore._stagedViewModels.size).toBe(0);
    });

    it('define promotes an existing staged entry instead of creating a second instance', () => {
      const vmStore = new ViewModelStoreBaseMock();

      const staged = vmStore.defineStaged(
        { id: 'promote-me', VM: ViewModelBaseMock, payload: {} },
        {},
      );
      const defined = vmStore.define({
        id: 'promote-me',
        VM: ViewModelBaseMock,
        payload: {},
      });

      expect(defined).toBe(staged);
      expect(vmStore._viewModels.get('promote-me')).toBe(staged);
      expect(vmStore._stagedViewModels.size).toBe(0);
      // init ran exactly once (in defineStaged) — promotion must not re-init
      expect(staged.spies.init).toBeCalledTimes(1);
    });

    it('commitStaged promotes a staged instance to a committed entry', () => {
      const vmStore = new ViewModelStoreBaseMock();

      const vm = vmStore.defineStaged(
        { id: 'commit', VM: ViewModelBaseMock, payload: {} },
        {},
      );
      vmStore.commitStaged('commit', vm);

      expect(vmStore._viewModels.get('commit')).toBe(vm);
      expect(vmStore._stagedViewModels.size).toBe(0);
      // class index is attached on commit
      expect(vmStore._viewModelIdsByClasses.get(ViewModelBaseMock)).toEqual([
        'commit',
      ]);
      expect(vmStore.get(ViewModelBaseMock)).toBe(vm);
    });

    it('commitStaged is a no-op for an unknown id', () => {
      const vmStore = new ViewModelStoreBaseMock();

      vmStore.commitStaged('missing');

      expect(vmStore._viewModels.size).toBe(0);
    });

    it('commitStaged re-registers an instance whose staged entry was dropped', () => {
      const vmStore = new ViewModelStoreBaseMock();

      const vm = vmStore.defineStaged(
        { id: 'self-heal', VM: ViewModelBaseMock, payload: {} },
        {},
      );
      vmStore.dropStaged('self-heal', vm);
      expect(vmStore.get('self-heal')).toBe(null);

      // the owning fiber is still alive and commits — the instance is
      // registered as committed even though the staged entry is gone
      vmStore.commitStaged('self-heal', vm);

      expect(vmStore._viewModels.get('self-heal')).toBe(vm);
      expect(vmStore.get('self-heal')).toBe(vm);
    });

    it('dropStaged removes only the entry that belongs to the given instance', () => {
      const vmStore = new ViewModelStoreBaseMock();

      const first = vmStore.defineStaged(
        { id: 'reuse', VM: ViewModelBaseMock, payload: {} },
        {},
      );
      vmStore.dropStaged('reuse', first);

      const second = vmStore.defineStaged(
        { id: 'reuse', VM: ViewModelBaseMock, payload: {} },
        {},
      );
      expect(second).not.toBe(first);

      // a stale finalizer for the previous instance must not drop the new one
      vmStore.dropStaged('reuse', first);
      expect(vmStore.get('reuse')).toBe(second);

      vmStore.dropStaged('reuse', second);
      expect(vmStore.get('reuse')).toBe(null);
    });

    it('finalizeStaged drops the entry and unmounts the instance', () => {
      const vmStore = new ViewModelStoreBaseMock();

      const vm = vmStore.defineStaged(
        { id: 'finalized', VM: ViewModelBaseMock, payload: {} },
        {},
      );
      vmStore.finalizeStaged('finalized', vm);

      expect(vmStore.get('finalized')).toBe(null);
      // unmount releases constructor/init subscriptions via unmountSignal
      expect(vm.spies.unmount).toHaveBeenCalledTimes(1);
      expect(vm.unmountSignal.aborted).toBe(true);
    });

    it('finalizeStaged does not touch a VM committed meanwhile', () => {
      const vmStore = new ViewModelStoreBaseMock();

      const vm = vmStore.defineStaged(
        { id: 'committed', VM: ViewModelBaseMock, payload: {} },
        {},
      );
      vmStore.commitStaged('committed', vm);

      vmStore.finalizeStaged('committed', vm);

      expect(vmStore.get('committed')).toBe(vm);
      expect(vm.spies.unmount).not.toHaveBeenCalled();
    });

    it('commitStaged sweeps stale staged entries but keeps newer ones', async () => {
      const vmStore = new ViewModelStoreBaseMock();

      const stale = vmStore.defineStaged(
        { id: 'stale', VM: ViewModelBaseMock, payload: {} },
        {},
      );
      const promoted = vmStore.defineStaged(
        { id: 'promoted', VM: ViewModelBaseMock, payload: {} },
        {},
      );

      // commit of one fiber schedules a sweep of the current render pass
      vmStore.commitStaged('promoted', promoted);

      // entries staged by a LATER render pass must survive the sweep
      const newer = vmStore.defineStaged(
        { id: 'newer', VM: ViewModelBaseMock, payload: {} },
        {},
      );

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(vmStore.get('stale')).toBe(null);
      expect(vmStore.get('promoted')).toBe(promoted);
      expect(vmStore.get('newer')).toBe(newer);
      expect(stale.isMounted).toBe(false);
    });

    it('sweeping a staged entry never calls unmount on the instance', async () => {
      const vmStore = new ViewModelStoreBaseMock();

      const staged = vmStore.defineStaged(
        { id: 'silent', VM: ViewModelBaseMock, payload: {} },
        {},
      );
      const committed = vmStore.defineStaged(
        { id: 'committed', VM: ViewModelBaseMock, payload: {} },
        {},
      );
      vmStore.commitStaged('committed', committed);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(vmStore.get('silent')).toBe(null);
      expect(staged.spies.unmount).not.toHaveBeenCalled();
      expect(staged.spies.willUnmount).not.toHaveBeenCalled();
    });

    it('unmount removes staged entries as well', () => {
      const vmStore = new ViewModelStoreBaseMock();

      const vm = vmStore.defineStaged(
        { id: 'staged-unmount', VM: ViewModelBaseMock, payload: {} },
        {},
      );
      vmStore.unmount(vm);

      expect(vmStore._stagedViewModels.size).toBe(0);
      expect(vmStore.get('staged-unmount')).toBe(null);
      expect(vm.spies.unmount).toHaveBeenCalledTimes(1);
    });

    it('clean clears staged entries', () => {
      const vmStore = new ViewModelStoreBaseMock();

      vmStore.defineStaged(
        { id: 'staged-clean', VM: ViewModelBaseMock, payload: {} },
        {},
      );
      vmStore.clean();

      expect(vmStore._stagedViewModels.size).toBe(0);
      expect(vmStore.get('staged-clean')).toBe(null);
    });
  });
});
