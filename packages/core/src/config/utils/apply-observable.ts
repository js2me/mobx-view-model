import {
  applyObservable as applyObservableLib,
  type ObservableAnnotationsArray,
} from 'yummies/mobx';
import type { AnyObject } from 'yummies/types';

import type { ViewModelObservableConfig } from '../index.js';

export const applyObservable = <T extends AnyObject>(
  context: T,
  annotationsArray: ObservableAnnotationsArray,
  observableConfig: ViewModelObservableConfig,
) => {
  if (observableConfig.custom) {
    return observableConfig.custom(context, annotationsArray);
  }

  applyObservableLib(
    context,
    annotationsArray as ObservableAnnotationsArray<T>,
    observableConfig.useDecorators,
  );
};
