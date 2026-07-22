import { action, comparer, computed, observable, runInAction } from 'mobx';
import { isShallowEqual } from 'yummies/data';
import { startViewTransitionSafety } from 'yummies/html';
import type { ObservableAnnotationsArray } from 'yummies/mobx';
import type { AnyObject, EmptyObject, Maybe, MaybePromise } from 'yummies/types';
import {
  applyObservable,
  mergeVMConfigs,
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
import { ViewModelState } from './view-model.base.types.js';
import { VIEW_MODEL_MARKER } from '../symbols/index.js';

const baseAnnotations: ObservableAnnotationsArray = [
  [observable.ref, 'vmState'],
  [computed, 'isMounted', 'parentViewModel'],
  [action, 'willMount', 'didMount', 'didUnmount', 'willUnmount', 'mount', 'unmount'],
];

export class ViewModelBase<
  Payload extends AnyObject = EmptyObject,
  ParentViewModel extends AnyViewModel | AnyViewModelSimple | null = null,
  ComponentProps extends AnyObject = AnyObject,
> implements ViewModel<Payload, ParentViewModel> {
  private abortController: AbortController;

  public unmountSignal: AbortSignal;

  id: string;

  private vmState: ViewModelState;

  /** In-flight mount(); re-entrant calls must reuse the same Promise. */
  #mountPromise?: PromiseLike<void>;

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
    this.vmState = 'init';
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
        observable[this.vmConfig.payloadObservable],
        '_payload',
      ]);
    }

    if (this.vmConfig.payloadComputed) {
      if (this.vmConfig.payloadComputed === 'struct') {
        annotations.push([
          computed({ equals: comparer.structural }),
          'payload',
        ]);
      } else {
        annotations.push([
          computed({
            equals:
              this.vmConfig.payloadComputed === true
                ? undefined
                : this.vmConfig.payloadComputed,
          }),
          'payload',
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
    return this.vmState === 'mounted';
  }

  protected willUnmount(): void {
    /* Empty method to be overridden */
  }

  /**
   * Empty method to be overridden
   */
  protected willMount(): MaybePromise<void> {
    /* Empty method to be overridden */
  }

  /**
   * The method is called when the view starts mounting
   */
  mount() {
    if (this.vmState === 'mounted') {
      return;
    }
    if (this.#mountPromise) {
      return this.#mountPromise;
    }

    this.vmState = 'mounting';
    const result = this.willMount();

    const finalizeMount = () => {
      if (this.vmState !== 'mounting') return;
      this.vmConfig.onMount?.(this);
      startViewTransitionSafety(
        () => {
          runInAction(() => {
            this.vmState = 'mounted';
            this.didMount();
          });
        },
        { disabled: !this.vmConfig.startViewTransitions.mount },
      );
    };

    if (result instanceof Promise) {
      this.#mountPromise = result.then(finalizeMount);
      return this.#mountPromise;
    }

    return finalizeMount();
  }

  /**
   * The method is called when the view was mounted
   */
  protected didMount() {
    /* Empty method to be overridden */
  }

  /**
   * The method is called when the view starts unmounting
   */
  unmount() {
    this.#mountPromise = undefined;
    runInAction(() => (this.vmState = 'unmounting'));
    this.willUnmount();
    this.vmConfig.onUnmount?.(this);
    startViewTransitionSafety(
      () => {
        runInAction(() => (this.vmState = 'unmounted'));
        this.didUnmount();
        this.abortController.abort();
      },
      {
        disabled: !this.vmConfig.startViewTransitions.unmount,
      },
    );
  }

  /**
   * The method is called when the view was unmounted
   */
  protected didUnmount() {
    /* Empty method to be overridden */
  }

  /**
   * Checks whether the given view model is a child of the current view model.
   * When `deep` is `true`, checks the whole parent chain.
   *
   * [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-models/base-implementation#haschild-vm-anyviewmodel--anyviewmodelsimple-deep-boolean-boolean)
   */
  protected hasChild(vm: AnyViewModel | AnyViewModelSimple, deep?: boolean) {
    if (deep) {
      let usedVm: Maybe<AnyViewModel | AnyViewModelSimple> = vm;
      while (usedVm) {
        if (usedVm.parentViewModel === this) {
          return true;
        } else {
          usedVm = usedVm.parentViewModel;
        }
      }

      return false;
    }

    return vm.parentViewModel === this;
  }

  /**
   * Checks whether the given view model is a parent of the current view model.
   * When `deep` is `true`, checks the whole parent chain.
   *
   * [**Documentation**](https://js2me.github.io/mobx-view-model/api/view-models/base-implementation#hasparent-vm-anyviewmodel--anyviewmodelsimple-deep-boolean-boolean)
   */
  protected hasParent(vm: AnyViewModel | AnyViewModelSimple, deep?: boolean) {
    if (deep) {
      let usedVm: Maybe<AnyViewModel | AnyViewModelSimple> =
        this.parentViewModel;
      while (usedVm) {
        if (usedVm === vm) {
          return true;
        } else {
          usedVm = usedVm.parentViewModel;
        }
      }

      return false;
    } else {
      return this.parentViewModel === vm;
    }
  }

  /**
   * Returns the parent view model
   */
  get parentViewModel() {
    return this.vmParams.parentViewModel as ParentViewModel;
  }

  /**
   * The method is called when the payload changes in the react component
   */
  setPayload(payload: Payload) {
    const isEqual = !!this.isPayloadEqual?.(this._payload, payload)

    if (!isEqual) {
      startViewTransitionSafety(
        () => runInAction(() => (this._payload = payload)),
        { disabled: !this.vmConfig.startViewTransitions.payloadChange },
      );
    }

    return isEqual;
  }

  static {
    // @ts-ignore
    this.prototype[VIEW_MODEL_MARKER] = true;
  }
}
