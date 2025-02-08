import { act, render } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

import { ViewModelBaseMock } from '../view-model/view-model.base.test.js';

import { withLazyViewModel } from './with-lazy-view-model.js';
import { ViewModelProps } from './with-view-model.js';

describe('withLazyViewModel', () => {
  test('should has preload static method', async () => {
    class VM extends ViewModelBaseMock {
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
    class VM extends ViewModelBaseMock {
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
    });
    const Component = withLazyViewModel(loadFn);
    await act(async () => render(<Component />));
    expect(loadFn).toHaveBeenCalledTimes(1);
  });
});
