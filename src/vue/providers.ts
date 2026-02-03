import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import type {
  AnyViewModel,
  AnyViewModelSimple,
  ViewModelStore,
} from '../view-model/index.js';
import { provideActiveViewModel } from './use-active-view-model.js';
import { provideViewModelsStore } from './use-view-model-store.js';

export const ViewModelsProvider = defineComponent({
  name: 'ViewModelsProvider',
  props: {
    value: {
      type: Object as PropType<ViewModelStore>,
      required: true,
    },
  },
  setup(props, { slots }) {
    provideViewModelsStore(props.value);
    return () => slots.default?.();
  },
});

export const ActiveViewModelProvider = defineComponent({
  name: 'ActiveViewModelProvider',
  props: {
    value: {
      type: Object as PropType<AnyViewModel | AnyViewModelSimple>,
      required: true,
    },
  },
  setup(props, { slots }) {
    provideActiveViewModel(props.value);
    return () => slots.default?.();
  },
});
