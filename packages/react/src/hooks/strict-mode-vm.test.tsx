import { makeObservable } from 'mobx';
import { describe, expect, test, afterEach } from 'vitest';
import { StrictMode } from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import {
  ViewModelBase,
  ViewModelStoreBase,
  type ViewModelParams,
} from 'mobx-view-model';
import {
  ActiveViewModelProvider,
  ViewModelsProvider,
  useCreateViewModel,
  withViewModel,
} from 'mobx-view-model-react';

class PageVM extends ViewModelBase {
  constructor(params?: Partial<ViewModelParams>) {
    super({ ...params, id: params?.id ?? '1', payload: params?.payload as any });
    makeObservable(this);
  }
}

class LayoutVM extends ViewModelBase {
  constructor(params?: Partial<ViewModelParams>) {
    super({
      ...params,
      id: params?.id ?? 'layout',
      payload: params?.payload as any,
    });
    makeObservable(this);
  }
}

class CardVM extends ViewModelBase {
  constructor(params?: Partial<ViewModelParams>) {
    super({
      ...params,
      id: params?.id ?? 'card',
      payload: params?.payload as any,
    });
    makeObservable(this);
  }
}

afterEach(() => cleanup());

describe('StrictMode', () => {
  test('withViewModel still renders under StrictMode', async () => {
    const store = new ViewModelStoreBase();
    const Page = withViewModel(PageVM, ({ model }) => (
      <span data-testid="page">{model.id}</span>
    ));

    await act(async () => {
      render(
        <StrictMode>
          <ViewModelsProvider value={store}>
            <Page />
          </ViewModelsProvider>
        </StrictMode>,
      );
    });

    expect(screen.getByTestId('page')).toBeDefined();
    expect(store.getIds(PageVM)).toHaveLength(1);
    expect(store.get(PageVM)?.isMounted).toBe(true);
  });

  test('two sibling explicit-id VMs survive StrictMode remount', async () => {
    const store = new ViewModelStoreBase();
    const CardA = withViewModel(
      CardVM,
      ({ model }) => <span data-testid="card-a">{model.id}</span>,
      { id: 'card-a' },
    );
    const CardB = withViewModel(
      CardVM,
      ({ model }) => <span data-testid="card-b">{model.id}</span>,
      { id: 'card-b' },
    );

    const Layout = () => {
      const layoutVm = useCreateViewModel(LayoutVM, {}, { id: 'layout' });
      return (
        <ActiveViewModelProvider value={layoutVm}>
          <CardA />
          <CardB />
        </ActiveViewModelProvider>
      );
    };

    await act(async () => {
      render(
        <StrictMode>
          <ViewModelsProvider value={store}>
            <Layout />
          </ViewModelsProvider>
        </StrictMode>,
      );
    });

    expect(store.getIds(CardVM).sort()).toEqual(['card-a', 'card-b']);
    expect(screen.getByTestId('card-a').textContent).toBe('card-a');
    expect(screen.getByTestId('card-b').textContent).toBe('card-b');
    expect(store.get('card-a')?.isMounted).toBe(true);
    expect(store.get('card-b')?.isMounted).toBe(true);
  });
});
