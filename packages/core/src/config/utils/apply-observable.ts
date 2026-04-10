import {
  applyObservable as applyObservableLib,
  type ObservableAnnotationsArray,
} from 'yummies/mobx';
import type { AnyObject } from 'yummies/types';

import type { ViewModelObservableConfig } from '../index.js';

export const applyObservable = (
  context: AnyObject,
  annotationsArray: ObservableAnnotationsArray,
  observableConfig: ViewModelObservableConfig,
) => {
  if (observableConfig.custom) {
    return observableConfig.custom(context, annotationsArray);
  }

  if (observableConfig.disableWrapping) {
    return;
  }

  applyObservableLib(context, annotationsArray, observableConfig.useDecorators);
};
