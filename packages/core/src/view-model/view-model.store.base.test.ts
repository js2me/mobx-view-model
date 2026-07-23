import type { Mock } from 'vitest';
import { describe, expect, it, vi } from 'vitest';

import type { Maybe } from 'yummies/types';
import type { ViewModelsConfig } from '../config/types.js';
import { ViewModelBaseMock } from './view-model.base.test.js';
import type { ViewModel } from './view-model.js';
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
    generateViewModelId: Mock<
      (config: ViewModelGenerateIdConfig<ViewModel>) => string
    >;
    get: Mock<
      (
        vmLookup: Maybe<ViewModelLookup<AnyViewModel | AnyViewModelSimple>>,
      ) => AnyViewModel | AnyViewModelSimple | null
    >;
  } = {
    generateViewModelId: vi.fn(),
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

  generateViewModelId<VM extends ViewModel>(
    config: ViewModelGenerateIdConfig<VM>,
  ): string {
    const result = super.generateViewModelId(config);
    this.spies.generateViewModelId.mockReturnValue(result)(config);
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

  it('has define / create / unmountNew methods', () => {
    const vmStore = new ViewModelStoreBaseMock();
    expect(vmStore.define).toBeDefined();
    expect(vmStore.create).toBeDefined();
    expect(vmStore.unmountNew).toBeDefined();
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

  it('unmountNew unmounts and removes the view model', () => {
    const vmStore = new ViewModelStoreBaseMock();
    const vm = vmStore.define({
      id: '1',
      VM: ViewModelBaseMock,
      payload: {},
    });
    vm.mount();

    vmStore.unmountNew(vm);

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

    vmStore.unmountNew(first);
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
});
