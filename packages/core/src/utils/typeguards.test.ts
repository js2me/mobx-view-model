import { describe, expect, it } from "vitest";
import { ViewModelBase } from "../view-model";
import { isViewModelClass } from "./typeguards";

describe('typeguards', () => {
  
  describe('isViewModelClass', () => {
    it('test 1 level', () => {
      class VM1 extends ViewModelBase {};
      expect(isViewModelClass(VM1)).toBe(true);
    });

    it('test 2 level', () => {
      class VM extends ViewModelBase {}
      class VM1 extends VM {};
      expect(isViewModelClass(VM1)).toBe(true);
    })
  })
})