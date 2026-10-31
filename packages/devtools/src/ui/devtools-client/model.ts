import { type ViewModelDevtools, ViewModelImpl } from '@/model';

export class DevtoolsClientVM extends ViewModelImpl<{
  devtools: ViewModelDevtools;
}> {
  devtools = this.payload.devtools;
}
