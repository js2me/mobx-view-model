import { describe, expect, it } from 'vitest';
import { ViewModelBase } from '../view-model/index.js';
import {
  isViewModel,
  isViewModelClass,
  isViewModelSimple,
  isViewModelSimpleClass,
} from './typeguards.js';

describe('typeguards', () => {
  describe('isViewModelClass', () => {
    it('test 1 level', () => {
      class VM1 extends ViewModelBase {}
      expect(isViewModelClass(VM1)).toBe(true);
    });

    it('test 2 level', () => {
      class VM extends ViewModelBase {}
      class VM1 extends VM {}
      expect(isViewModelClass(VM1)).toBe(true);
    });
  });

  describe('isViewModel', () => {
    it('test 1 level', () => {
      class VM extends ViewModelBase {}
      const vm = new VM({ id: '1', payload: {} });
      expect(isViewModel(vm)).toBe(true);
    });

    it('test 2 level', () => {
      class VM1 extends ViewModelBase {}
      class VM extends VM1 {}
      const vm = new VM({ id: '1', payload: {} });
      expect(isViewModel(vm)).toBe(true);
    });

    it('returns false for plain object', () => {
      const vm = {};
      expect(isViewModel(vm)).toBe(false);
    });
  });

  describe('isViewModelSimpleClass', () => {
    it('test 1 level', () => {
      class VM1 {}
      expect(isViewModelSimpleClass(VM1)).toBe(true);
    });

    it('test 2 level', () => {
      class VM {}
      class VM1 extends VM {}
      expect(isViewModelSimpleClass(VM1)).toBe(true);
    });

    it('returns false for ViewModelBase class', () => {
      class VM1 extends ViewModelBase {}
      expect(isViewModelSimpleClass(VM1)).toBe(false);
    });
  });

  describe('isViewModelSimple', () => {
    it('test 1 level', () => {
      class VM1 {}
      const vm = new VM1();
      expect(isViewModelSimple(vm)).toBe(true);
    });

    it('test 2 level', () => {
      class VM {}
      class VM1 extends VM {}
      const vm = new VM1();
      expect(isViewModelSimple(vm)).toBe(true);
    });

    it('returns false for view model instance', () => {
      class VM extends ViewModelBase {}
      const vm = new VM({ id: '1', payload: {} });
      expect(isViewModelSimple(vm)).toBe(false);
    });
  });
});
