/**
 * Ожидаемое число ререндеров задаётся через
 * `MOBX_VM_REACT_MATRIX_EXPECT_OBSERVER_PAYLOAD_VIEW_CALLS` (`4` или `7`).
 * Сейчас оба прогона (React 19 в `mobx-view-model-react` и React 18 в
 * `mobx-view-model-react-matrix-react18`) выставляют `7`: при изолированном React 18.3.1
 * в отдельном пакете получается то же число, что и при React 19.
 * См. `packages/react/vitest.config.ts` и `packages/react-react18-matrix/vitest.config.ts`.
 */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, test, vi } from 'vitest';
import { createCounter } from 'yummies/complex';
import { ViewModelBaseMock } from '../../../core/src/view-model/view-model.base.mock.js';
import { comparer } from 'mobx';
import { createTestPayloadChanges } from './with-view-model.payload-manipulations.shared.js';
import { type ViewModelProps, withViewModel } from './with-view-model.js';

const createIdGenerator = (prefix?: string) =>
  createCounter((counter) => `${prefix ?? ''}${counter}`);

function matrixExpectObserverPayloadViewCalls(): number {
  const v = process.env.MOBX_VM_REACT_MATRIX_EXPECT_OBSERVER_PAYLOAD_VIEW_CALLS;
  if (v !== '4' && v !== '7') {
    throw new Error(
      'Tests in *.react-matrix.test.tsx require MOBX_VM_REACT_MATRIX_EXPECT_OBSERVER_PAYLOAD_VIEW_CALLS=4 or 7 (set by vitest configs).',
    );
  }
  return Number(v);
}

describe('withViewModel', () => {
  describe('payload manipulations (react version matrix)', () => {
    test('View should be updated when payload is changed (touching payload in View)', async () => {
      class VM extends ViewModelBaseMock<{ counter: number }> {}
      const View = vi.fn(({ model }: ViewModelProps<VM>) => {
        return <div>{`hello ${model.id} ${model.payload.counter}`}</div>;
      });
      const Component = withViewModel(VM, { generateId: createIdGenerator() })(
        View,
      );

      const SuperContainer = () => {
        const [counter, setCounter] = useState(0);

        return (
          <>
            <button
              data-testid={'increment'}
              onClick={() => setCounter(counter + 1)}
            >
              increment
            </button>
            <Component payload={{ counter }} />
          </>
        );
      };

      await act(() => render(<SuperContainer />));

      const incrementButton = screen.getByTestId('increment');

      fireEvent.click(incrementButton);
      fireEvent.click(incrementButton);
      fireEvent.click(incrementButton);

      expect(View).toHaveBeenCalledTimes(matrixExpectObserverPayloadViewCalls());
    });

    test('View should have actual payload state (default isPayloadEqual + observer view wrap() + render payload in view)', async () => {
      await createTestPayloadChanges({
        expectedCounterInPayload: 3,
        expectedRerendersCountInVMComponentView: matrixExpectObserverPayloadViewCalls(),
        wrapViewInObserver: true,
        renderPayloadInView: true,
      });
    });

    test('View should have actual payload state (comparePayload: strict + observer view wrap() + render payload in view)', async () => {
      await createTestPayloadChanges({
        vmConfig: { comparePayload: 'strict' },
        expectedCounterInPayload: 3,
        expectedRerendersCountInVMComponentView: matrixExpectObserverPayloadViewCalls(),
        wrapViewInObserver: true,
        renderPayloadInView: true,
      });
    });

    test('View should have actual payload state (comparePayload: shallow + observer view wrap() + render payload in view)', async () => {
      await createTestPayloadChanges({
        vmConfig: { comparePayload: 'shallow' },
        expectedCounterInPayload: 3,
        expectedRerendersCountInVMComponentView: matrixExpectObserverPayloadViewCalls(),
        wrapViewInObserver: true,
        renderPayloadInView: true,
      });
    });

    test('View should have actual payload state (comparePayload: false + observer view wrap() + render payload in view)', async () => {
      await createTestPayloadChanges({
        vmConfig: { comparePayload: false },
        expectedCounterInPayload: 3,
        expectedRerendersCountInVMComponentView: matrixExpectObserverPayloadViewCalls(),
        wrapViewInObserver: true,
        renderPayloadInView: true,
      });
    });

    test('View should have actual payload state (comparePayload: comparer.shallow + observer view wrap() + render payload in view)', async () => {
      await createTestPayloadChanges({
        vmConfig: { comparePayload: comparer.shallow },
        expectedCounterInPayload: 3,
        expectedRerendersCountInVMComponentView: matrixExpectObserverPayloadViewCalls(),
        wrapViewInObserver: true,
        renderPayloadInView: true,
      });
    });

    test('View should have actual payload state (comparePayload: comparer.structural + observer view wrap() + render payload in view)', async () => {
      await createTestPayloadChanges({
        vmConfig: { comparePayload: comparer.structural },
        expectedCounterInPayload: 3,
        expectedRerendersCountInVMComponentView: matrixExpectObserverPayloadViewCalls(),
        wrapViewInObserver: true,
        renderPayloadInView: true,
      });
    });

    test('View should have actual payload state (comparePayload: comparer.identity + observer view wrap() + render payload in view)', async () => {
      await createTestPayloadChanges({
        vmConfig: { comparePayload: comparer.identity },
        expectedCounterInPayload: 3,
        expectedRerendersCountInVMComponentView: matrixExpectObserverPayloadViewCalls(),
        wrapViewInObserver: true,
        renderPayloadInView: true,
      });
    });

    test('View should have actual payload state (comparePayload: comparer.default + observer view wrap() + render payload in view)', async () => {
      await createTestPayloadChanges({
        vmConfig: { comparePayload: comparer.default },
        expectedCounterInPayload: 3,
        expectedRerendersCountInVMComponentView: matrixExpectObserverPayloadViewCalls(),
        wrapViewInObserver: true,
        renderPayloadInView: true,
      });
    });
  });
});
