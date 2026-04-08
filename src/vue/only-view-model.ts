import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import type { Class, IsPartial } from 'yummies/types';
import type { AnyViewModel, ViewModelSimple } from '../view-model/index.js';
import type { UseCreateViewModelConfig } from './types.js';
import { useCreateViewModel } from './use-create-view-model.js';

export type OnlyViewModelProps<TViewModel extends AnyViewModel> = {
  model: Class<TViewModel>;
} & (IsPartial<TViewModel['payload']> extends true
  ? {
      payload?: TViewModel['payload'];
      config?: UseCreateViewModelConfig<TViewModel>;
    }
  : {
      payload: TViewModel['payload'];
      config?: UseCreateViewModelConfig<TViewModel>;
    });

export const OnlyViewModel = defineComponent({
  name: 'OnlyViewModel',
  props: {
    model: {
      type: Function as unknown as PropType<Class<any>>,
      required: true,
    },
    payload: {
      type: null as unknown as PropType<any>,
      required: false,
    },
    config: {
      type: Object as PropType<UseCreateViewModelConfig<any>>,
      required: false,
    },
  },
  setup(props, { slots }) {
    const vm = useCreateViewModel(
      props.model as unknown as Class<AnyViewModel | ViewModelSimple>,
      props.payload,
      props.config,
    ) as AnyViewModel | ViewModelSimple;

    return () => {
      if ((vm as AnyViewModel).isMounted === false) {
        return null;
      }

      return slots.default?.({ model: vm });
    };
  },
});
