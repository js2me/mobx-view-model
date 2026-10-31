import type { AnyViewModel, ViewModelSimple } from 'mobx-view-model';
import type { PropType, SetupContext, VNodeChild } from 'vue';
import { computed, defineComponent, h } from 'vue';
import type { Class, IsPartial } from 'yummies/types';
import { observer } from './observer.js';
import { useRenderAllowed } from './render-state.js';
import type { UseCreateViewModelConfig } from './types.js';
import { useCreateViewModel } from './use-create-view-model.js';

export type OnlyViewModelProps<TViewModel extends AnyViewModel> = {
  model: Class<TViewModel>;
  children?: VNodeChild | ((model: TViewModel) => VNodeChild);
} & (IsPartial<TViewModel['payload']> extends true
  ? {
      payload?: TViewModel['payload'];
      config?: UseCreateViewModelConfig<TViewModel>;
    }
  : {
      payload: TViewModel['payload'];
      config?: UseCreateViewModelConfig<TViewModel>;
    });

const OnlyViewModelImpl = observer(
  defineComponent({
    name: 'OnlyViewModel',
    props: {
      model: {
        type: Function as unknown as PropType<Class<any>>,
        required: true,
      },
      children: {
        type: null as unknown as PropType<
          VNodeChild | ((model: any) => VNodeChild)
        >,
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

        return typeof props.children === 'function'
          ? props.children(vm)
          : (props.children ?? slots.default?.({ model: vm }));
      };
    },
  }),
);

/** Renders a real component vnode both as a Vue component and as a direct call. */
export function OnlyViewModel<TViewModel extends AnyViewModel>(
  props: OnlyViewModelProps<TViewModel>,
  ctx?: Pick<SetupContext, 'attrs' | 'slots'>,
): VNodeChild {
  return h(OnlyViewModelImpl, { ...ctx?.attrs, ...props }, ctx?.slots);
}

OnlyViewModel.props = OnlyViewModelImpl.props;
OnlyViewModel.inheritAttrs = false;
