import { RootStore } from "@/stores/root-store";
import { AnyViewModel, AnyViewModelSimple, ViewModelBase, ViewModelParams } from "mobx-view-model";
import { AnyObject, EmptyObject } from "yummies/types";

export class VM<
  Payload extends AnyObject = EmptyObject,
  ParentViewModel extends AnyViewModel | AnyViewModelSimple | null = null,
  ComponentProps extends AnyObject = AnyObject
> extends ViewModelBase<Payload, ParentViewModel, ComponentProps> {
  
  constructor(protected rootStore: RootStore, params: ViewModelParams<Payload, ParentViewModel, ComponentProps>) {
    // @ts-ignore
    super(params)
  }
}