import { ViewModelBase, type ViewModelParams } from 'mobx-view-model';
import { withViewModel, type ViewModelProps } from 'mobx-view-model';

class VM extends ViewModelBase<{ foo: string }> {
  constructor(params: ViewModelParams<{ foo: string }>) {
    super(params);
  }
}

interface BaseProps extends ViewModelProps<VM> {
  label: string;
}

const C = withViewModel(VM, ({ model, label }: BaseProps) => (
  <div>
    {model.payload.foo}
    {label}
  </div>
));

export const reproUsage = <C payload={{ foo: 'x' }} label="ok" />;
