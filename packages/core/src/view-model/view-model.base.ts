import {
  action,
  comparer,
  computed,
  makeObservable,
  observable,
  runInAction,
} from 'mobx';
import { startViewTransitionSafety } from 'yummies/html';
import type { ObservableAnnotationsArray } from 'yummies/mobx';
import type { AnyObject, EmptyObject, Maybe, MaybePromise } from 'yummies/types';
import {
  applyObservable,
  mergeVMConfigs
} from '../config/index.js';
import type { ViewModel } from './view-model.js';
import type { ViewModelStore } from './view-model.store.js';
import type {
  AnyViewModel,
  AnyViewModelSimple,
  ViewModelFullInfo,
  ViewModelInfo,
  ViewModelParams,
} from './view-model.types.js';
import { _internals } from '../internals.js';

const baseAnnotations: ObservableAnnotationsArray = [
  [computed, 'isMounted', 'parentViewModel'],
  [
    action,
    'willMount',
    'didMount',
    'didUnmount',
    'willUnmount',
    'mount',
    'unmount',
  ],
];

export class ViewModelBase<
  Payload extends AnyObject = EmptyObject,
  ParentViewModel extends AnyViewModel | AnyViewModelSimple | null = null,
  ComponentProps extends AnyObject = AnyObject,
> implements ViewModel<Payload, ParentViewModel> {
  private abortController: AbortController;

  public unmountSignal: AbortSignal;

  id: string;

  readonly vm: ViewModelInfo;

  protected props: ComponentProps;

  constructor(
    params: ViewModelParams<
      Payload,
      ParentViewModel,
      ComponentProps
    >,
  ) {
    this.id = params.id;
    const config = mergeVMConfigs(params.vmConfig);

    this.#vm = makeObservable({
      params,
      config,
      data: params.data,
      state: 'init',
      payloadComparator: _internals.comparer[config.comparePayload as 'strict'] || config.comparePayload || undefined,
      payload: params.payload,
    }, {
      state: observable.ref,
      payload: config.payloadObservable && observable[config.payloadObservable],
    });
    this.vm = this.#vm;
    this.props = params.props ?? ({} as ComponentProps);
    this.abortController = new AbortController();
    this.unmountSignal = this.abortController.signal;

    const annotations: ObservableAnnotationsArray = [...baseAnnotations];

    if (this.#vm.config.payloadComputed) {
      if (this.#vm.config.payloadComputed === 'struct') {
        annotations.push([
          computed({ equals: comparer.structural }),
          'payload',
        ]);
      } else {
        annotations.push([
          computed({
            equals:
              this.#vm.config.payloadComputed === true
                ? undefined
                : this.#vm.config.payloadComputed,
          }),
          'payload',
        ]);
      }
    }

    applyObservable(this, annotations, this.#vm.config.observable.viewModels);
  }

  get payload() {
    return this.#vm.payload;
  }

  protected get viewModels(): ViewModelStore {
    if (process.env.NODE_ENV !== 'production' && !this.#vm.params.viewModels) {
      console.error(
        `Error #3: No access to ViewModelStore.\n` +
        'This happened because [viewModels] param is not provided during to creating instance ViewModelBase.\n' +
        'More info: https://js2me.github.io/mobx-view-model/errors/3',
      );
    }

    return this.#vm.params.viewModels!;
  }

  get isMounted() {
    return this.#vm.state === 'mounted' || this.#vm.state === 'hydrated';
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
  mount(): MaybePromise<void> {
    if (this.isMounted) {
      return;
    }
    if (this.#mountPromise) {
      return this.#mountPromise;
    }

    // Revive support: an unmounted VM can be mounted again (e.g. the React
    // fiber survived while Suspense hid the tree). The signal aborted by the
    // previous unmount must be replaced with a fresh one.
    if (this.abortController.signal.aborted) {
      this.abortController = new AbortController();
      this.unmountSignal = this.abortController.signal;
    }

    this.#vm.state = 'mounting';
    const result = this.willMount();

    const finalizeMount = () => {
      if (this.#vm.state !== 'mounting') return;
      this.#vm.config.onMount?.(this);
      startViewTransitionSafety(
        () => {
          runInAction(() => {
            this.#vm.state = 'mounted';
            this.didMount();
          });
        },
        { disabled: !this.#vm.config.startViewTransitions.mount },
      );
    };

    if (
      result != null &&
      typeof (result as PromiseLike<void>).then === 'function'
    ) {
      this.#mountPromise = Promise.resolve(result).then(finalizeMount);
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
    runInAction(() => (this.#vm.state = 'unmounting'));
    this.willUnmount();
    this.#vm.config.onUnmount?.(this);
    startViewTransitionSafety(
      () => {
        // mount() may have been re-entered (revive) while the view transition
        // was pending — mirror finalizeMount()'s guard.
        if (this.#vm.state !== 'unmounting') return;
        runInAction(() => (this.#vm.state = 'unmounted'));
        this.didUnmount();
        this.abortController.abort();
      },
      {
        disabled: !this.#vm.config.startViewTransitions.unmount,
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
    return this.#vm.params.parentViewModel as ParentViewModel;
  }

  /**
   * The method is called when the payload changes in the react component
   */
  setPayload(payload: Payload) {
    const isEqual = !!this.#vm.payloadComparator?.(this.#vm.payload, payload);

    if (!isEqual) {
      startViewTransitionSafety(
        () => runInAction(() => (this.#vm.payload = payload)),
        { disabled: !this.#vm.config.startViewTransitions.payloadChange },
      );
    }

    return isEqual;
  }

  static {
    // @ts-ignore
    this.prototype[_internals.marker] = true;
  }
  /** In-flight mount(); re-entrant calls must reuse the same Promise. */
  #mountPromise?: Promise<void>;
  #vm: ViewModelFullInfo<Payload, ParentViewModel, ComponentProps>;
}
