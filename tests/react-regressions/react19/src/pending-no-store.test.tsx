import { act, render } from '@testing-library/react';
import { ViewModelBase, type ViewModelParams } from 'mobx-view-model';
import { useCreateViewModel } from 'mobx-view-model-react';
import { Activity } from 'react';
import { expect, test, vi } from 'vitest';

test('an unrelated commit preserves a hidden VM and its constructor subscription', async () => {
  const source = new EventTarget();
  const onChange = vi.fn();
  const onMount = vi.fn();
  const onCreate = vi.fn();

  class Model extends ViewModelBase {
    constructor(params: ViewModelParams) {
      super(params);
      onCreate(this);
      source.addEventListener('change', onChange, { signal: this.unmountSignal });
    }

    protected didMount() { onMount(this); }
  }
  function Hidden() {
    useCreateViewModel(Model);
    return null;
  }
  class SiblingModel {}
  function Sibling() {
    useCreateViewModel(SiblingModel);
    return null;
  }

  const tree = (visible: boolean) => <Activity mode={visible ? 'visible' : 'hidden'}><Hidden /></Activity>;
  const view = await act(async () => render(tree(false)));
  expect(onCreate).toHaveBeenCalledTimes(1);
  expect(onMount).not.toHaveBeenCalled();

  const sibling = render(<Sibling />);
  try {
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
    view.rerender(tree(true));
    expect(onMount).toHaveBeenCalledWith(onCreate.mock.calls[0][0]);
    source.dispatchEvent(new Event('change'));
    expect(onChange).toHaveBeenCalledTimes(1);
  } finally {
    sibling.unmount();
    view.unmount();
  }
  source.dispatchEvent(new Event('change'));
  expect(onChange).toHaveBeenCalledTimes(1);
});
