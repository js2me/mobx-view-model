import { describe, expect, it, vi } from 'vitest';

import type { AnyObject, EmptyObject, Maybe } from 'yummies/types';
import type { ViewModelsConfig } from '../config/types.js';
import { ViewModelBaseMock } from './view-model.base.test.js';
import type { ViewModel } from './view-model.js';
import { ViewModelStoreBase } from './view-model.store.base.js';
import type { ViewModelStore } from './view-model.store.js';
import type {
  ViewModelGenerateIdConfig,
  ViewModelLookup,
} from './view-model.store.types.js';
import type {
  AnyViewModel,
  AnyViewModelSimple,
  ViewModelParams,
} from './view-model.types.js';

export class ViewModelStoreBaseMock extends ViewModelStoreBase {
  spies = {
    generateViewModelId: vi.fn(),
    get: vi.fn(),
  };

  get _viewModels() {
    return this.viewModels;
  }
  get _linkedComponentVMClasses() {
    return this.linkedComponentVMClasses;
  }
  get _viewModelIdsByClasses() {
    return this.viewModelIdsByClasses;
  }
  get _instanceAttachedCount() {
    return this.instanceAttachedCount;
  }
  get _mountingViews() {
    return this.mountingViews;
  }
  get _unmountingViews() {
    return this.unmountingViews;
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
  it('has attach method', () => {
    const vmStore = new ViewModelStoreBaseMock();
    expect(vmStore.attach).toBeDefined();
  });
  it('has createViewModel method', () => {
    const vmStore = new ViewModelStoreBaseMock();
    expect(vmStore.createViewModel).toBeDefined();
  });

  it('create instance', () => {
    const vmStore = new ViewModelStoreBaseMock();
    expect(vmStore).toBeDefined();
  });

  it('is able to attach view model', async () => {
    const vmStore = new ViewModelStoreBaseMock();
    const vm = new ViewModelBaseMock({ id: '1' });
    await vmStore.attach(vm);
    expect(vmStore.get('1')).toBe(vm);
    expect(vmStore._instanceAttachedCount.get('1')).toBe(1);
  });

  it('is able to detach view model', async () => {
    const vmStore = new ViewModelStoreBaseMock();
    const vm = new ViewModelBaseMock({ id: '1' });
    await vmStore.attach(vm);
    await vmStore.detach('1');
    expect(vmStore.get('1')).toBe(null);
    expect(vmStore._instanceAttachedCount.get('1')).toBe(undefined);
  });

  it('is able to get total mounted views count', async () => {
    const vmStore = new ViewModelStoreBaseMock();
    await vmStore.attach(new ViewModelBaseMock({ id: '1' }));
    await vmStore.attach(new ViewModelBaseMock({ id: '1' }));
    await vmStore.attach(new ViewModelBaseMock({ id: '2' }));
    await vmStore.attach(new ViewModelBaseMock({ id: '2' }));
    await vmStore.attach(new ViewModelBaseMock({ id: '3' }));
    await vmStore.attach(new ViewModelBaseMock({ id: '3' }));
    expect(vmStore.mountedViewsCount).toBe(6);
  });

  it('accessing to parent view models using store [using parentViewModelId and vmStore]', async () => {
    class TestViewModelImpl1<
      Payload extends AnyObject = EmptyObject,
      ParentViewModel extends AnyViewModel | AnyViewModelSimple | null = null,
    > extends ViewModelBaseMock<Payload, ParentViewModel> {
      constructor(
        private vmStore: ViewModelStore,
        params?: Partial<ViewModelParams<Payload>>,
      ) {
        super(params);
      }

      protected getParentViewModel(
        parentViewModelId: Maybe<string>,
      ): ParentViewModel {
        return this.vmStore.get(parentViewModelId)! as ParentViewModel;
      }
    }

    class VMParent extends TestViewModelImpl1 {}
    class VMChild extends TestViewModelImpl1<any, VMParent> {}

    const vmStore = new ViewModelStoreBaseMock();

    const parentVM = new VMParent(vmStore, { id: 'parent' });

    await vmStore.attach(parentVM);

    const childVM = new VMChild(vmStore, {
      id: 'child',
      parentViewModelId: 'parent',
    });

    await vmStore.attach(parentVM);

    expect(childVM.parentViewModel.id).toBe('parent');
  });

  it('able to get access to view model by id', async () => {
    const vmStore = new ViewModelStoreBaseMock();

    const vm = new ViewModelBaseMock();

    await vmStore.attach(vm);

    expect(vmStore.get(vm.id)).toBe(vm);
  });

  it('able to get access to view model by Class', async () => {
    const vmStore = new ViewModelStoreBaseMock();

    class MyVM extends ViewModelBaseMock {}
    const vm = new MyVM();

    await vmStore.attach(vm);

    expect(vmStore.get(MyVM)).toBe(vm);
  });

  it('able to get instance id by id (getId method)', async () => {
    const vmStore = new ViewModelStoreBaseMock();

    class MyVM extends ViewModelBaseMock {}
    const vm = new MyVM();

    await vmStore.attach(vm);

    expect(vmStore.getId(vm.id)).toBe(vm.id);
  });

  it('able to get instance id by Class (getId method)', async () => {
    const vmStore = new ViewModelStoreBaseMock();

    class MyVM extends ViewModelBaseMock {}
    const vm = new MyVM();

    await vmStore.attach(vm);

    expect(vmStore.getId(MyVM)).toBe(vm.id);
  });

  it('bug with overriding observable after create second store', async () => {
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
