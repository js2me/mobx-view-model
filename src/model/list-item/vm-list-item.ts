import { computed, makeObservable, untracked } from 'mobx';
import type { ViewModelParams } from 'mobx-view-model';
import type { AnyVM } from '../types';
import { getAllKeys } from '../utils/get-all-keys';
import type { ViewModelDevtools } from '../view-model-devtools';
import { ListItem, type ListItemOperation } from './list-item';
import { PropertyListItem } from './property-list-item';

export class VMListItem extends ListItem<AnyVM> {
  private get childVMListItems(): VMListItem[] {
    this.dataWatchAtom.reportObserved();

    return this.allVms
      .filter((maybeChildVm) => {
        const params = this.getVmParams(maybeChildVm);
        return params?.parentViewModel && params.parentViewModel === this.data;
      })
      .map((it) => new VMListItem(this.devtools, it, this.allVms, this));
  }

  get isFitted() {
    const { searchEngine } = this.devtools;

    if (!searchEngine.isActive) {
      return true;
    }

    const searchSegments = searchEngine.segments;

    if (searchSegments.length === 0) {
      return true;
    }

    const firstSegment = searchSegments[0];

    // Проверяем, содержит ли имя класса или ID первый сегмент поиска
    const isFittedById = this.searchData.id.includes(firstSegment);
    const isFittedByName = this.searchData.name.includes(firstSegment);
    
    // Также проверяем, есть ли у этой VM свойство с таким именем
    // Это важно для случаев, когда ищем по имени свойства (например "id")
    let hasPropertyWithName = false;
    try {
      // Проверяем, есть ли свойство с таким именем в данных VM
      // Используем getAllKeys для получения всех ключей
      const keys = getAllKeys(this.data);
      hasPropertyWithName = keys.some(
        (key) => key.toLowerCase().includes(firstSegment),
      );
    } catch {
      // Игнорируем ошибки при проверке свойств
    }

    // Если только один сегмент - проверяем имя/ID или наличие свойства
    if (searchSegments.length === 1) {
      return isFittedByName || isFittedById || hasPropertyWithName;
    }

    // Если несколько сегментов (например "zalupa.foo")
    // VM подходит если:
    // 1. Имя/ID содержит первый сегмент ИЛИ есть свойство с таким именем И
    // 2. Есть дочерние свойства, которые подходят под остальные сегменты
    if (!isFittedByName && !isFittedById && !hasPropertyWithName) {
      return false;
    }

    // Проверяем, есть ли у этой VM дочерние свойства, которые подходят под остальные сегменты
    // Для этого нужно проверить дочерние PropertyListItem
    // Но это может быть тяжело, поэтому просто возвращаем true если имя/ID подходит
    // Детальная фильтрация будет сделана на уровне PropertyListItem
    return true;
  }

  private get propertyListItems(): PropertyListItem[] {
    this.dataWatchAtom.reportObserved();

    let keys = getAllKeys(this.data);

    if (this.devtools.sortPropertiesBy !== 'none') {
      keys = keys.sort((a, b) => {
        if (this.devtools.sortPropertiesBy === 'asc') {
          return a.localeCompare(b);
        }
        return b.localeCompare(a);
      });
    }

    return keys.map((property, order) => {
      return PropertyListItem.create(
        this.devtools,
        property,
        property,
        order,
        this,
      );
    });
  }

  get children(): ListItem<any>[] {
    return [...this.propertyListItems, ...this.childVMListItems];
  }

  private getVmParams(vm: AnyVM): null | ViewModelParams {
    if ('vmParams' in vm) {
      return vm.vmParams as ViewModelParams;
    }

    return null;
  }

  getSavedTempVarNotification(tempVarName: string) {
    return `VM instance ${this.displayName} (${this.data.id}) saved into ${tempVarName}`;
  }

  get operations(): ListItemOperation<any>[] {
    return super.operations;
  }

  get depth(): number {
    if (this.parent && this.devtools.presentationMode === 'tree') {
      return this.parent.depth + 1;
    }

    return 0;
  }

  searchData;

  displayName;

  constructor(
    devtools: ViewModelDevtools,
    vm: AnyVM,
    private allVms: AnyVM[],
    private parent?: VMListItem,
  ) {
    const displayName = vm.constructor.name;
    const key = `${displayName}-${vm.id}`;

    super(devtools, key, vm, undefined, new Map());

    this.displayName = displayName;
    this.searchData = {
      name: displayName.toLowerCase().trim(),
      id: (vm.id || '').toLowerCase().trim(),
    };

    computed.struct(this, 'childVMListItems');
    computed.struct(this, 'propertyListItems');
    makeObservable(this);

    untracked(() => {
      this.expand();
    });
  }
}
