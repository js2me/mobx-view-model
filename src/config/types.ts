import { DeepPartial } from 'yummies/utils/types';

/**
 * Configuration options for view models.
 */
export interface ViewModelsConfig {
  /**
   * Indicates whether to enable transitions for the start view.
   *
   * !!! This feature is experimental and not all browsers support it yet.
   *
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/DOMException)
   */
  startViewTransitions: {
    mount: boolean;
    unmount: boolean;
    payloadChange: boolean;
  };
}

export type ViewModelsRawConfig = Omit<
  ViewModelsConfig,
  'startViewTransitions'
> & {
  startViewTransitions?:
    | DeepPartial<ViewModelsConfig['startViewTransitions']>
    | boolean;
};
