import { enableObservableTracking } from 'mobx-solid';
import type { AnyViewModel } from 'mobx-view-model';
import { Show, type JSX } from 'solid-js';
import type { Class, IsPartial } from 'yummies/types';
import {
  type UseCreateViewModelConfig,
  useCreateViewModel,
} from '../hooks/index.js';

export type OnlyViewModelProps<TViewModel extends AnyViewModel> = {
  model: Class<TViewModel>;
  children?: JSX.Element | ((model: TViewModel) => JSX.Element);
} & (IsPartial<TViewModel['payload']> extends true
  ? {
      payload?: TViewModel['payload'];
      config?: UseCreateViewModelConfig<TViewModel>;
    }
  : {
      payload: TViewModel['payload'];
      config?: UseCreateViewModelConfig<TViewModel>;
    });

export const OnlyViewModel = <TViewModel extends AnyViewModel>(
  props: OnlyViewModelProps<TViewModel>,
) => {
  enableObservableTracking();

  const vm = useCreateViewModel(
    props.model,
    () => props.payload,
    props.config,
  );

  const Content = () =>
    typeof props.children === 'function'
      ? props.children(vm)
      : props.children;

  return (
    <Show when={() => vm.isMounted}>
      <Content />
    </Show>
  );
};
