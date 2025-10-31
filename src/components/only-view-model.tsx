import { observer } from 'mobx-react-lite';
import type { ReactNode } from 'react';
import type { Class, IsPartial } from 'yummies/types';

import {
  type UseCreateViewModelConfig,
  useCreateViewModel,
} from '../hooks/index.js';
import type { AnyViewModel } from '../view-model/index.js';

export type OnlyViewModelProps<TViewModel extends AnyViewModel> = {
  model: Class<TViewModel>;
  children?: ReactNode | ((model: TViewModel) => ReactNode);
} & (IsPartial<TViewModel['payload']> extends true
  ? {
      payload?: TViewModel['payload'];
      config?: UseCreateViewModelConfig<TViewModel>;
    }
  : {
      payload: TViewModel['payload'];
      config?: UseCreateViewModelConfig<TViewModel>;
    });

export const OnlyViewModel = observer(
  <TViewModel extends AnyViewModel>({
    model,
    config,
    payload,
    children,
  }: OnlyViewModelProps<TViewModel>) => {
    const vm = useCreateViewModel(model, payload, config);

    if (!vm.isMounted) {
      return null;
    }

    if (typeof children === 'function') {
      return children(vm);
    }
    return <>{children}</>;
  },
);
