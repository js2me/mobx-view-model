import { action, comparer, computed, observable, runInAction } from 'mobx';
import { isShallowEqual } from 'yummies/data';
import { startViewTransitionSafety } from 'yummies/html';
import type { AnyObject, EmptyObject, Maybe } from 'yummies/types';
import {
  applyObservable,
  mergeVMConfigs,
  type ObservableAnnotationsArray,
  type ViewModelsConfig,
} from '../config/index.js';

import type { ViewModel } from './view-model.js';
import type { ViewModelStore } from './view-model.store.js';
import type {
  AnyViewModel,
  AnyViewModelSimple,
  PayloadCompareFn,
  ViewModelParams,
} from './view-model.types.js';

declare const process: { env: { NODE_ENV?: string } };

const baseAnnotations: ObservableAnnotationsArray = [
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

export class ViewModelBase<
  Payload extends AnyObject = EmptyObject,
  ParentViewModel extends AnyViewModel | AnyViewModelSimple | null = null,
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

  protected props: ComponentProps;

  constructor(
    protected vmParams: ViewModelParams<
      Payload,
      ParentViewModel,
      ComponentProps
    >,
  ) {
    this.id = vmParams.id;
    this.vmConfig = mergeVMConfigs(vmParams.vmConfig);
    this._payload = vmParams.payload;
    this.props = vmParams.props ?? ({} as ComponentProps);
    this.abortController = new AbortController();
    this.unmountSignal = this.abortController.signal;

    if (this.vmConfig.comparePayload === 'strict') {
      this.isPayloadEqual = comparer.structural;
    } else if (this.vmConfig.comparePayload === 'shallow') {
      this.isPayloadEqual = isShallowEqual;
    } else if (typeof this.vmConfig.comparePayload === 'function') {
      this.isPayloadEqual = this.vmConfig.comparePayload;
    }

    const annotations: ObservableAnnotationsArray = [...baseAnnotations];

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
        `Error #3: No access to ViewModelStore.\n` +
          'This happened because [viewModels] param is not provided during to creating instance ViewModelBase.\n' +
          'More info: https://js2me.github.io/mobx-view-model/errors/3',
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
