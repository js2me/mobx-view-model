import { describe, expect, it, vi } from 'vitest';

import { AnyObject, EmptyObject, Maybe } from '../utils/types.js';

import { ViewModelMock } from './view-model.impl.test.js';
import { ViewModel } from './view-model.js';
import { ViewModelStoreImpl } from './view-model.store.impl.js';
import { ViewModelStore } from './view-model.store.js';
import {
  ViewModelGenerateIdConfig,
  ViewModelLookup,
} from './view-model.store.types.js';
import { AnyViewModel, ViewModelParams } from './view-model.types.js';

export class ViewModelStoreMock extends ViewModelStoreImpl {
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

  get<T extends AnyViewModel>(vmLookup: Maybe<ViewModelLookup<T>>): T | null {
    const result = super.get<T>(vmLookup);
    this.spies.get.mockReturnValue(result)(vmLookup);
    return result;
  }
}

describe('ViewModelStoreImpl', () => {
  it('has clean method', () => {
    const vmStore = new ViewModelStoreMock();
    expect(vmStore.clean).toBeDefined();
  });
  it('has attach method', () => {
    const vmStore = new ViewModelStoreMock();
    expect(vmStore.attach).toBeDefined();
  });
  it('has createViewModel method', () => {
    const vmStore = new ViewModelStoreMock();
    expect(vmStore.createViewModel).toBeDefined();
  });

  it('create instance', () => {
    const vmStore = new ViewModelStoreMock();
    expect(vmStore).toBeDefined();
  });

  it('is able to attach view model', async () => {
    const vmStore = new ViewModelStoreMock();
    const vm = new ViewModelMock({ id: '1' });
    await vmStore.attach(vm);
    expect(vmStore.get('1')).toBe(vm);
    expect(vmStore._instanceAttachedCount.get('1')).toBe(1);
  });

  it('is able to detach view model', async () => {
    const vmStore = new ViewModelStoreMock();
    const vm = new ViewModelMock({ id: '1' });
    await vmStore.attach(vm);
    await vmStore.detach('1');
    expect(vmStore.get('1')).toBe(null);
    expect(vmStore._instanceAttachedCount.get('1')).toBe(undefined);
  });

  it('is able to get total mounted views count', async () => {
    const vmStore = new ViewModelStoreMock();
    await vmStore.attach(new ViewModelMock({ id: '1' }));
    await vmStore.attach(new ViewModelMock({ id: '1' }));
    await vmStore.attach(new ViewModelMock({ id: '2' }));
    await vmStore.attach(new ViewModelMock({ id: '2' }));
    await vmStore.attach(new ViewModelMock({ id: '3' }));
    await vmStore.attach(new ViewModelMock({ id: '3' }));
    expect(vmStore.mountedViewsCount).toBe(6);
  });

  it('accessing to parent view models using store [using parentViewModelId and vmStore]', async () => {
    class TestViewModelImpl1<
      Payload extends AnyObject = EmptyObject,
      ParentViewModel extends AnyViewModel | null = null,
    > extends ViewModelMock<Payload, ParentViewModel> {
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

    const vmStore = new ViewModelStoreMock();

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
    const vmStore = new ViewModelStoreMock();

    const vm = new ViewModelMock();

    await vmStore.attach(vm);

    expect(vmStore.get(vm.id)).toBe(vm);
  });

  it('able to get access to view model by Class', async () => {
    const vmStore = new ViewModelStoreMock();

    class MyVM extends ViewModelMock {}
    const vm = new MyVM();

    await vmStore.attach(vm);

    expect(vmStore.get(MyVM)).toBe(vm);
  });

  it('able to get instance id by id (getId method)', async () => {
    const vmStore = new ViewModelStoreMock();

    class MyVM extends ViewModelMock {}
    const vm = new MyVM();

    await vmStore.attach(vm);

    expect(vmStore.getId(vm.id)).toBe(vm.id);
  });

  it('able to get instance id by Class (getId method)', async () => {
    const vmStore = new ViewModelStoreMock();

    class MyVM extends ViewModelMock {}
    const vm = new MyVM();

    await vmStore.attach(vm);

    expect(vmStore.getId(MyVM)).toBe(vm.id);
  });
});
