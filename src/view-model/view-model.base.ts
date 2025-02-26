/* eslint-disable @typescript-eslint/no-unused-vars */
import { isEqual } from 'lodash-es';
import {
  action,
  computed,
  makeObservable,
  observable,
  runInAction,
} from 'mobx';
import { isShallowEqual } from 'yummies/data';
import { startViewTransitionSafety } from 'yummies/html';

import { ViewModelsConfig } from '../config/index.js';
import { mergeVMConfigs } from '../config/utils/merge-vm-configs.js';
import { AnyObject, EmptyObject, Maybe } from '../utils/types.js';

import { ViewModel } from './view-model.js';
import { ViewModelStore } from './view-model.store.js';
import {
  AnyViewModel,
  PayloadCompareFn,
  ViewModelParams,
} from './view-model.types.js';

declare const process: { env: { NODE_ENV?: string } };

export class ViewModelBase<
  Payload extends AnyObject = EmptyObject,
  ParentViewModel extends AnyViewModel | null = null,
> implements ViewModel<Payload, ParentViewModel>
{
  private abortController: AbortController;

  public unmountSignal: AbortSignal;

  id: string;

  isMounted = false;

  isUnmounting = false;

  public payload: Payload;

  protected vmConfig: ViewModelsConfig;

  protected isPayloadEqual?: PayloadCompareFn;

  constructor(protected params: ViewModelParams<Payload, ParentViewModel>) {
    this.id = params.id;
    this.vmConfig = mergeVMConfigs(params.config);
    this.payload = params.payload;
    this.abortController = new AbortController();
    this.unmountSignal = this.abortController.signal;

    observable.ref(this, 'isMounted');
    observable.ref(this, 'isUnmounting');
    computed(this, 'parentViewModel');
    if (this.vmConfig.payloadObservable === 'ref') {
      observable.ref(this, 'payload');
    } else {
      observable.deep(this, 'payload');
    }
    action.bound(this, 'mount');
    action(this, 'didMount');
    action.bound(this, 'unmount');
    action(this, 'didUnmount');
    action(this, 'setPayload');

    makeObservable(this);

    if (this.vmConfig.comparePayload === 'strict') {
      this.isPayloadEqual = isEqual;
    } else if (this.vmConfig.comparePayload === 'shallow') {
      this.isPayloadEqual = isShallowEqual;
    } else if (typeof this.vmConfig.comparePayload === 'function') {
      this.isPayloadEqual = this.vmConfig.comparePayload;
    }
  }

  protected get viewModels(): ViewModelStore {
    if (process.env.NODE_ENV !== 'production' && !this.params.viewModels) {
      console.warn(
        'accessing to viewModels is not possible. [viewModels] param is not setted during to creating instance ViewModelBase',
      );
    }

    return this.params.viewModels!;
  }

  willUnmount(): void {
    /* Empty method to be overridden */
  }

  willMount(): void {
    /* Empty method to be overridden */
  }

  /**
   * The method is called when the view starts mounting
   */
  mount() {
    this.vmConfig.onMount?.(this);
    startViewTransitionSafety(
      () => {
        runInAction(() => {
          this.isMounted = true;
        });
      },
      {
        disabled: !this.vmConfig.startViewTransitions.mount,
      },
    );

    this.didMount();
  }

  /**
   * The method is called when the view was mounted
   */
  didMount() {
    /* Empty method to be overridden */
  }

  /**
   * The method is called when the view starts unmounting
   */
  unmount() {
    this.vmConfig.onUnmount?.(this);
    startViewTransitionSafety(
      () => {
        runInAction(() => {
          this.isMounted = false;
        });
      },
      {
        disabled: !this.vmConfig.startViewTransitions.unmount,
      },
    );

    this.didUnmount();
  }

  /**
   * The method is called when the view was unmounted
   */
  didUnmount() {
    this.abortController.abort();
  }

  /**
   * The method is called when the payload of the view model was changed
   *
   * The state - "was changed" is determined inside the setPayload method
   */
  payloadChanged(payload: Payload) {
    /* Empty method to be overridden */
  }

  /**
   * Returns the parent view model
   * For this property to work, the getParentViewModel method is required
   */
  get parentViewModel() {
    return this.getParentViewModel(this.params.parentViewModelId);
  }

  /**
   * The method is called when the payload changes in the react component
   */
  setPayload(payload: Payload) {
    if (!this.isPayloadEqual?.(this.payload, payload)) {
      startViewTransitionSafety(
        () => {
          runInAction(() => {
            this.payload = payload;
            this.payloadChanged(payload);
          });
        },
        {
          disabled: !this.vmConfig.startViewTransitions.payloadChange,
        },
      );
    }
  }

  /**
   * The method of getting the parent view model
   */
  protected getParentViewModel(
    parentViewModelId: Maybe<string>,
  ): ParentViewModel {
    return (
      this.params.parentViewModel ??
      (this.viewModels?.get(parentViewModelId) as unknown as ParentViewModel)
    );
  }
}
