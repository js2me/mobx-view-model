import type {
  AnyViewModel,
  AnyViewModelSimple,
  ViewModelStore,
} from 'mobx-view-model';
import type { PropType, VNodeChild } from 'vue';
import { defineComponent } from 'vue';
import { provideActiveViewModel } from './use-active-view-model.js';
import { provideViewModelsStore } from './use-view-model-store.js';

export const ViewModelsProvider = defineComponent({
  name: 'ViewModelsProvider',
  props: {
    children: {
      type: null as unknown as PropType<VNodeChild | (() => VNodeChild)>,
    },
    value: {
      type: Object as PropType<ViewModelStore>,
      required: true,
    },
  },
  setup(props, { slots }) {
    provideViewModelsStore(props.value);
    return () =>
      typeof props.children === 'function'
        ? props.children()
        : (props.children ?? slots.default?.());
  },
});

export const ActiveViewModelProvider = defineComponent({
  name: 'ActiveViewModelProvider',
  props: {
    children: {
      type: null as unknown as PropType<VNodeChild | (() => VNodeChild)>,
    },
    value: {
      type: Object as PropType<AnyViewModel | AnyViewModelSimple>,
      required: true,
    },
  },
  setup(props, { slots }) {
    provideActiveViewModel(props.value);
    return () =>
      typeof props.children === 'function'
        ? props.children()
        : (props.children ?? slots.default?.());
  },
});
