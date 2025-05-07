import { makeObservable } from 'mobx';
import { AnyObject } from 'yummies/utils/types';

import { ViewModelObservableConfig } from '../index.js';

export type ObservableAnnotationsArray = [string, any][];

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
  if (observableConfig.useDecorators) {
    annotationsArray.forEach(([field, annotation]) => {
      annotation(context, field);
    });

    makeObservable(context);
  } else {
    makeObservable(context, Object.fromEntries(annotationsArray));
  }
};
