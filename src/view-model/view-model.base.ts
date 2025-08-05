/* eslint-disable @typescript-eslint/no-unused-vars */
import { action, comparer, computed, observable, runInAction } from 'mobx';
import { isShallowEqual } from 'yummies/data';
import { startViewTransitionSafety } from 'yummies/html';

import {
  ViewModelsConfig,
  applyObservable,
  ObservableAnnotationsArray,
  mergeVMConfigs,
} from '../config/index.js';
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
  ComponentProps extends AnyObject = AnyObject,
> implements ViewModel<Payload, ParentViewModel>
{
  private abortController: AbortController;

  public unmountSignal: AbortSignal;

  id: string;

  private _isMounted = false;

  private _isUnmounting = false;

  private _payload: Payload;

  public vmConfig: ViewModelsConfig;

  protected isPayloadEqual?: PayloadCompareFn<Payload>;

  /**
   * @deprecated use `vmParams`. This property will be removed in next major release
   * Reason: this word is very useful for users, so `vmParams` is more library-targered naming
   */
  protected params: ViewModelParams<Payload, ParentViewModel, ComponentProps>;

  constructor(
    protected vmParams: ViewModelParams<
      Payload,
      ParentViewModel,
      ComponentProps
    >,
  ) {
    this.params = vmParams;
    this.id = vmParams.id;
    this.vmConfig = mergeVMConfigs(vmParams.config ?? vmParams.vmConfig);
    this._payload = vmParams.payload;
    this.abortController = new AbortController();
    this.unmountSignal = this.abortController.signal;

    if (this.vmConfig.comparePayload === 'strict') {
      this.isPayloadEqual = comparer.structural;
    } else if (this.vmConfig.comparePayload === 'shallow') {
      this.isPayloadEqual = isShallowEqual;
    } else if (typeof this.vmConfig.comparePayload === 'function') {
      this.isPayloadEqual = this.vmConfig.comparePayload;
    }

    const annotations: ObservableAnnotationsArray = [
      ['_isMounted', observable.ref],
      ['_isUnmounting', observable.ref],
      ['isMounted', computed],
      ['isUnmounting', computed],
      ['parentViewModel', computed],
      ['mount', action.bound],
      ['didMount', action],
      ['unmount', action.bound],
      ['didUnmount', action],
      ['willUnmount', action],
      ['setPayload', action],
    ];

    if (this.vmConfig.payloadObservable !== false) {
      annotations.push([
        '_payload',
        observable[this.vmConfig.payloadObservable ?? 'ref'],
      ]);
    }

    if (this.vmConfig.payloadComputed) {
      if (this.vmConfig.payloadComputed === 'struct') {
        annotations.push(['payload', computed.struct]);
      } else {
        annotations.push([
          'payload',
          computed({
            equals:
              this.vmConfig.payloadComputed === true
                ? undefined
                : this.vmConfig.payloadComputed,
          }),
        ]);
      }
    }

    applyObservable(this, annotations, this.vmConfig.observable.viewModels);
  }

  get payload() {
    return this._payload;
  }

  protected get viewModels(): ViewModelStore {
    if (process.env.NODE_ENV !== 'production' && !this.vmParams.viewModels) {
      console.error(
        'accessing to viewModels is not possible. [viewModels] param is not setted during to creating instance ViewModelBase',
      );
    }

    return this.vmParams.viewModels!;
  }

  get isMounted() {
    return this._isMounted;
  }

  get isUnmounting() {
    return this._isUnmounting;
  }

  willUnmount(): void {
    this._isUnmounting = true;
  }

  /**
   * Empty method to be overridden
   */
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
          this._isMounted = true;
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
          this._isMounted = false;
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

    runInAction(() => {
      this._isUnmounting = false;
    });
  }

  /**
   * The method is called when the payload of the view model was changed
   *
   * The state - "was changed" is determined inside the setPayload method
   */
  payloadChanged(payload: Payload, prevPayload: Payload) {
    /* Empty method to be overridden */
  }

  /**
   * Returns the parent view model
   * For this property to work, the getParentViewModel method is required
   */
  get parentViewModel() {
    return this.getParentViewModel(this.vmParams.parentViewModelId);
  }

  /**
   * The method is called when the payload changes in the react component
   */
  setPayload(payload: Payload) {
    if (!this.isPayloadEqual?.(this._payload, payload)) {
      startViewTransitionSafety(
        () => {
          runInAction(() => {
            this.payloadChanged(payload, this._payload);
            this._payload = payload;
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
      this.vmParams.parentViewModel ??
      (this.viewModels?.get(parentViewModelId) as unknown as ParentViewModel)
    );
  }
}
