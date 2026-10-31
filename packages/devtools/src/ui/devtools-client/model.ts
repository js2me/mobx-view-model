import { ViewModelImpl } from '@/model/lib/view-model.impl';
import type { ViewModelDevtools } from '@/model/view-model-devtools';

export class DevtoolsClientVM extends ViewModelImpl<{
  devtools: ViewModelDevtools;
}> {
  devtools = this.payload.devtools;
}
