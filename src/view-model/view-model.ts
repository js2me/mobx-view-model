import { AnyObject, EmptyObject } from '../utils/types.js';

import { AnyViewModel } from './view-model.types.js';

/**
 * The main interface for all view models.
 * View model is a class that helps to manage state and lifecycle of a component.
 */
export interface ViewModel<
  Payload extends AnyObject = EmptyObject,
  ParentViewModel extends AnyViewModel | null = null,
> {
  /**
   * The unique identifier for the view model.
   */
  readonly id: string;

  /**
   * The current payload of the view model.
   * Payload is an object that contains the data that is passed from the parent component.
   * Payload is observable and can be changed by calling the setPayload() method.
   */
  payload: Payload;

  /**
   * State that determines if ViewModel is mounted together with a component.
   * This state is determined by handling the mount()\unmount() methods.
   *
   * This parameter is not working as expected if you are using `useCreateViewModel` hook.
   * Because if you are using `withViewModel` HOC then the view model is mounted together with a component.
   */
  isMounted: boolean;

  /**
   * The parent view model of the current view model.
   * Parent view model is the one that is above the current view model in the tree of view models.
   * Parent view model is determined by the getParentViewModel() method.
   */
  readonly parentViewModel: ParentViewModel;

  /**
   * This method is called when the component is starts mounting in the React tree.
   * Before mount() method. After create instance of ViewModel.
   */
  willMount(): void;

  /**
   * This method is called when the component is starts mounting in the React tree.
   * The base implementation assumes that after calling this method, the {isMounted} state
   * will be true.
   *
   * Also, this method can return a Promise for lazy mounting of the view model.
   *
   * NOTE: The behavior of the `mount()` method may depend on the implementation of your ViewModelStore.
   */
  mount(): void | Promise<void>;

  /**
   * The method that is called after the view model is fully mounted.
   * This method is called only once when the view model is mounted.
   */
  didMount(): void;

  /**
   * The method that is called after the view model is fully unmounted.
   * This method is called only once when the view model is unmounted.
   */
  didUnmount(): void;

  /**
   * This method is called when the component is starts unmounting from the React tree.
   * The base implementation assumes that after calling this method, the {isMounted} state
   * will be false.
   *
   * Also, this method can return a Promise for lazy unmounting of the view model.
   *
   * NOTE: The behavior of the `mount()` method may depend on the implementation of your ViewModelStore.
   */
  unmount(): void | Promise<void>;

  /**
   * The method that sets the payload of the view model.
   * This method is called with a new payload and should update the payload of the view model.
   */
  setPayload(payload: Payload): void;

  /**
   * The method that is called when the payload is changed.
   * This method is called with the new payload and should update the view model according to the new payload.
   */
  payloadChanged(payload: Payload): void;
}
