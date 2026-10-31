import { ViewModelBase } from 'mobx-view-model';
import { h } from 'vue';
import {
  type PropsVMComponentProps,
  useViewModel,
  type ViewModelPropsChargedProps,
  type VMComponentProps,
  withPropsViewModel,
  withViewModel,
} from './index.js';

class VM extends ViewModelBase<{ label: string; count: number }> {
  readonly specific = true;
}
class SimpleVM {
  setPayload(_payload: { label: string; count: number }) {}
}

// This fixture is compiled by ts:check; it is never rendered.
export function checkTypes() {
  const Page = withViewModel<VM, { title: string }>(VM, ({ model, title }) => {
    const specific: true = model.specific;
    return h('span', title + String(specific));
  });
  const PropsPage = withPropsViewModel(VM, ({ model, label, count }) =>
    h('span', model.payload.label + label + count),
  );
  const Simple = withPropsViewModel(SimpleVM, ({ model, label }) => {
    model.setPayload({ label, count: 1 });
    return h('span', label);
  });
  const found: VM = useViewModel(Page);
  const foundProps: VM = useViewModel(PropsPage);
  Page({ title: 'title', payload: { label: 'label', count: 1 } });
  PropsPage({ label: 'label', count: 1 });
  Simple({ label: 'label', count: 1 });
  // @ts-expect-error payload is required
  Page({ title: 'title' });
  // @ts-expect-error extra view props remain required
  Page({ payload: { label: 'label', count: 1 } });
  // @ts-expect-error count is required by the model payload
  PropsPage({ label: 'label' });
  // @ts-expect-error withPropsViewModel uses direct props
  PropsPage({ payload: { label: 'label', count: 1 } });
  // @ts-expect-error simple-model payload types are inferred from setPayload
  Simple({ label: 'label', count: 'invalid' });
  const props: PropsVMComponentProps<VM> = { label: 'label', count: 1 };
  const vmProps: VMComponentProps<VM, { title: string }> = {
    title: 'title',
    payload: props,
  };
  const charged: ViewModelPropsChargedProps<{ title: string }, VM> = {
    title: 'title',
    model: found,
  };
  return { foundProps, vmProps, charged };
}
