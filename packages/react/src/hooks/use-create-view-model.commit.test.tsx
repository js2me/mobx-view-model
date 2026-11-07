import { act, cleanup, render, screen } from '@testing-library/react';
import { ViewModelStoreBase, type ViewModelSimple } from 'mobx-view-model';
import { StrictMode, useState } from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { ViewModelsProvider } from '../components/index.js';
import { useCreateViewModel } from './use-create-view-model.js';

type Payload = { value: string };

const createFixture = () => {
  class PlainVM implements ViewModelSimple<Payload> {
    id = 'shared';
    value = 'existing';
    setPayload = vi.fn((payload: Payload) => {
      this.value = payload.value;
    });
    mount = vi.fn(() => { mountedValues.push(this.value); });
    unmount = vi.fn();
  }
  const mountedValues: string[] = [];
  const store = new ViewModelStoreBase();
  const vm = store.define({ VM: PlainVM, id: 'shared', payload: { value: 'existing' } });
  const Consumer = ({ payload, initialPayload }: { payload: Payload; initialPayload?: Payload }) => {
    const [ready, setReady] = useState(!initialPayload);
    const current = ready ? payload : initialPayload!;
    const model = useCreateViewModel(PlainVM, current, {
      VM: PlainVM, id: 'shared', payload: current,
    });
    if (!ready) setReady(true);
    return <span data-testid="value">{model.value}</span>;
  };
  const Page = (props: { payload: Payload; initialPayload?: Payload }) => (
    <ViewModelsProvider value={store}><Consumer {...props} /></ViewModelsProvider>
  );
  return { store, vm, mountedValues, Page, PlainVM };
};

afterEach(cleanup);

test('reconnects a simple VM after StrictMode effect cleanup', async () => {
  const { store, vm, Page, PlainVM } = createFixture();
  const view = await act(async () => render(
    <StrictMode><Page payload={{ value: 'current' }} /></StrictMode>,
  ));
  expect(vm.mount).toHaveBeenCalledTimes(2);
  expect(store.get('shared')).toBe(vm);
  expect(store.get(PlainVM)).toBe(vm);
  await act(async () => view.unmount());
  expect(store.get('shared')).toBeNull();
});

test('binds the committed payload before mounting a reused simple VM', async () => {
  const { mountedValues, Page } = createFixture();
  await act(async () => render(<Page payload={{ value: 'current' }} />));
  expect(mountedValues).toEqual(['current']);
});

test('does not skip stable-reference payload updates after a forced render', async () => {
  const { vm, Page } = createFixture();
  const first = { value: 'first' };
  const second = { value: 'second' };
  const third = { value: 'third' };
  const view = await act(async () => render(<Page payload={first} />));
  await act(async () => view.rerender(<Page payload={second} />));
  expect(screen.getByTestId('value').textContent).toBe('second');
  await act(async () => view.rerender(<Page payload={third} />));
  expect(screen.getByTestId('value').textContent).toBe('third');
  expect(vm.setPayload.mock.calls.map(([payload]) => payload)).toEqual([first, second, third]);
});

test('records a payload changed by a render-phase update before deferred binding', async () => {
  const { vm, Page } = createFixture();
  const first = { value: 'first' };
  const second = { value: 'second' };
  const view = await act(async () => render(<Page initialPayload={first} payload={second} />));
  expect(screen.getByTestId('value').textContent).toBe('second');
  await act(async () => view.rerender(<Page initialPayload={first} payload={first} />));
  expect(screen.getByTestId('value').textContent).toBe('first');
  expect(vm.setPayload.mock.calls.map(([payload]) => payload)).toEqual([second, first]);
});
