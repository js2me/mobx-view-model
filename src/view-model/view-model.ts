import { AnyObject, Class, EmptyObject } from '../utils/types.js';

import { ViewModelImpl } from './view-model.impl.js';
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
   */
  isMounted: boolean;

  /**
   * The parent view model of the current view model.
   * Parent view model is the one that is above the current view model in the tree of view models.
   * Parent view model is determined by the getParentViewModel() method.
   */
  readonly parentViewModel: ParentViewModel;

  /**
   * The method that is called when the view model is mounted.
   * This method is called after the view model is created and the payload is set.
   * This method is called only once when the view model is mounted.
   * The method should return a promise that is resolved when the view model is fully mounted.
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
   * The method that is called when the view model is unmounted.
   * This method is called before the view model is fully unmounted.
   * This method is called only once when the view model is unmounted.
   * The method can return a promise that is resolved when the view model is fully unmounted.
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

export type ViewModelClass<T extends AnyViewModel = AnyViewModel> = Class<
  T,
  ConstructorParameters<typeof ViewModelImpl<T['payload']>>
>;
