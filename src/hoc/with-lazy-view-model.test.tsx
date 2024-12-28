import { describe, expect, test, vi } from 'vitest';

import { ViewModelMock } from '../view-model/view-model.impl.test';

import { withLazyViewModel } from './with-lazy-view-model';
import { ViewModelProps } from './with-view-model';
import { act, render } from '@testing-library/react';

describe('withLazyViewModel', () => {
  test('should has preload static method', async () => {
    class VM extends ViewModelMock {
      mount() {
        super.mount();
      }
    }
    const View = ({ model }: ViewModelProps<VM>) => {
      return <div data-testid={'view'}>{`hello ${model.id}`}</div>;
    };
    const Component = withLazyViewModel(async () => {
      return {
        Model: VM,
        View,
      };
    });

    expect(Component.preload).toBeDefined();
  });
  test('render should call load fn', async () => {
    class VM extends ViewModelMock {
      mount() {
        super.mount();
      }
    }
    const View = ({ model }: ViewModelProps<VM>) => {
      return <div data-testid={'view'}>{`hello ${model.id}`}</div>;
    };
    const loadFn = vi.fn(async () => {
      return {
        Model: VM,
        View,
      };
    })
    const Component = withLazyViewModel(loadFn);
    await act(async () => render(<Component />));
    expect(loadFn).toHaveBeenCalledTimes(1);
  });
});
