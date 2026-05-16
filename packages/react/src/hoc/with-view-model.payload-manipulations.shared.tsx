import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ViewModelsRawConfig } from 'mobx-view-model';
import { observer } from 'mobx-react-lite';
import type { ComponentType } from 'react';
import { useState } from 'react';
import { expect, vi } from 'vitest';
import { createCounter } from 'yummies/complex';
import { ViewModelBaseMock } from '../../../core/src/view-model/view-model.base.mock.js';
import { type ViewModelProps, withViewModel } from './with-view-model.js';

const createIdGenerator = (prefix?: string) =>
  createCounter((counter) => `${prefix ?? ''}${counter}`);

export async function createTestPayloadChanges({
  vmConfig,
  wrapViewInObserver,
  renderPayloadInView,
  expectedCounterInPayload,
  expectedRerendersCountInVMComponentView,
}: {
  vmConfig?: ViewModelsRawConfig;
  wrapViewInObserver?: boolean;
  renderPayloadInView?: boolean;
  expectedCounterInPayload: number;
  expectedRerendersCountInVMComponentView: number;
}) {
  let vm: ViewModelBaseMock<{ counter: number }> | null;

  class VM extends ViewModelBaseMock<{ counter: number }> {
    constructor(...args: any[]) {
      super(...args);
      vm = this;
    }
  }

  const vmConnectedComponentViewRenderSpy = vi.fn();

  let VMConnectedComponentView: ComponentType<ViewModelProps<VM>> = ({
    model,
  }: ViewModelProps<VM>) => {
    vmConnectedComponentViewRenderSpy();
    return renderPayloadInView ? (
      <div>{`hello ${model.id} ${model.payload.counter}`}</div>
    ) : (
      <div>{`hello ${model.id}`}</div>
    );
  };

  if (wrapViewInObserver) {
    VMConnectedComponentView = observer(VMConnectedComponentView);
  }

  const Component = withViewModel(VM, {
    generateId: createIdGenerator(),
    vmConfig,
  })(VMConnectedComponentView);

  const SuperContainer = () => {
    const [counter, setCounter] = useState(0);
    const [, forceUpdate] = useState({});

    return (
      <>
        <button
          data-testid={'increment'}
          onClick={() => {
            setCounter(counter + 1);
          }}
        >
          increment
        </button>
        <button
          data-testid={'forceUpdate'}
          onClick={() => {
            forceUpdate({});
          }}
        >
          forceUpdate
        </button>
        <Component payload={{ counter }} />
      </>
    );
  };

  await act(() => render(<SuperContainer />));

  const incrementButton = screen.getByTestId('increment');
  const forceUpdateButton = screen.getByTestId('forceUpdate');

  fireEvent.click(incrementButton);
  fireEvent.click(incrementButton);
  fireEvent.click(incrementButton);

  // @ts-expect-error
  expect(vm?.payload).toEqual({ counter: expectedCounterInPayload });

  fireEvent.click(forceUpdateButton);
  fireEvent.click(forceUpdateButton);
  fireEvent.click(forceUpdateButton);

  expect(vmConnectedComponentViewRenderSpy).toHaveBeenCalledTimes(
    expectedRerendersCountInVMComponentView,
  );
}
