import type { AnyViewModel, ViewModelSimple } from 'mobx-view-model';
import type { PropType } from 'vue';
import { computed, defineComponent } from 'vue';
import type { Class, IsPartial } from 'yummies/types';
import { observer } from './observer.js';
import { useRenderAllowed } from './render-state.js';
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

export const OnlyViewModel = observer(
  defineComponent({
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
        computed(() => props.payload),
        props.config,
      ) as AnyViewModel | ViewModelSimple;

      const isRenderAllowed = useRenderAllowed(vm);
      return () => {
        if (!isRenderAllowed()) {
          return null;
        }

        return slots.default?.({ model: vm });
      };
    },
  }),
);
