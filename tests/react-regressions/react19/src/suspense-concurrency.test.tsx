import { makeObservable } from 'mobx';
import {
  ViewModelBase,
  ViewModelStoreBase,
  type AnyViewModel,
  type AnyViewModelSimple,
  type ViewModelParams,
} from 'mobx-view-model';
import { ViewModelsProvider, withViewModel } from 'mobx-view-model-react';
import { act, cleanup, render, screen } from '@testing-library/react';
import {
  StrictMode,
  Suspense,
  lazy,
  use,
  useState,
  type ComponentType,
} from 'react';
import { afterEach, describe, expect, test } from 'vitest';

class ViewModelBaseMock<
  Payload extends Record<string, unknown> = Record<string, never>,
  ParentViewModel extends AnyViewModel | AnyViewModelSimple | null = null,
> extends ViewModelBase<Payload, ParentViewModel> {
  constructor(params?: Partial<ViewModelParams<Payload, ParentViewModel>>) {
    super({
      ...params,
      id: params?.id ?? '1',
      payload: params?.payload as Payload,
    });
    makeObservable(this);
  }
}

class ViewModelStoreBaseMock extends ViewModelStoreBase {
  constructor() {
    super({});
  }
}

afterEach(() => {
  cleanup();
});

describe('React 19 concurrent Suspense VM lifecycle', () => {
  test('StrictMode retry of a lazy page commits exactly one VM', async () => {
    const vmStore = new ViewModelStoreBaseMock();
    class PageVM extends ViewModelBaseMock {}

    const Page = withViewModel(PageVM, ({ model }) => (
      <span data-testid="page">{model.id}</span>
    ));
    let resolvePage!: (module: { default: ComponentType }) => void;
    const LazyPage = lazy(
      () =>
        new Promise<{ default: ComponentType }>((resolve) => {
          resolvePage = resolve;
        }),
    );

    await act(async () => {
      render(
        <StrictMode>
          <ViewModelsProvider value={vmStore}>
            <Suspense fallback={<span data-testid="loading">Loading</span>}>
              <LazyPage />
            </Suspense>
          </ViewModelsProvider>
        </StrictMode>,
      );
    });

    expect(screen.getByTestId('loading')).toBeDefined();
    expect(vmStore.getIds(PageVM)).toHaveLength(0);

    await act(async () => {
      resolvePage({ default: Page });
    });
    await act(async () => {});

    expect(screen.getByTestId('page')).toBeDefined();
    expect(vmStore.getIds(PageVM)).toHaveLength(1);
  });

  test('React.use retry after a parent update commits one VM from the final render', async () => {
    const vmStore = new ViewModelStoreBaseMock();
    class DataVM extends ViewModelBaseMock {}

    let resolveData!: (value: string) => void;
    const data = new Promise<string>((resolve) => {
      resolveData = resolve;
    });
    const DataPage = withViewModel(DataVM, ({ model }) => {
      const value = use(data);
      return <span data-testid="data">{`${model.id}:${value}`}</span>;
    });

    let refresh!: () => void;
    const App = () => {
      const [, setRevision] = useState(0);
      refresh = () => setRevision((revision) => revision + 1);
      return (
        <Suspense fallback={<span data-testid="loading">Loading</span>}>
          <DataPage />
        </Suspense>
      );
    };

    await act(async () => {
      render(
        <ViewModelsProvider value={vmStore}>
          <App />
        </ViewModelsProvider>,
      );
    });

    expect(screen.getByTestId('loading')).toBeDefined();
    expect(vmStore.getIds(DataVM)).toHaveLength(0);

    await act(async () => {
      refresh();
    });
    expect(vmStore.getIds(DataVM)).toHaveLength(0);

    await act(async () => {
      resolveData('ready');
    });
    await act(async () => {});

    expect(screen.getByTestId('data').textContent).toMatch(/:ready$/);
    expect(vmStore.getIds(DataVM)).toHaveLength(1);
  });
});
