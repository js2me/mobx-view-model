/**
 * @vitest-environment node
 */
import { expect, test, vi } from 'vitest';

test('uses the canonical ID for resource reads and async SSR retries', async () => {
  const { ViewModelBase, ViewModelStoreBase, viewModelsConfig } =
    await import('mobx-view-model');
  const { renderToStringAsync } = await import('solid-js/web');
  const { ViewModelsProvider } = await import('../components/index.js');
  const { useCreateViewModel } = await import('./use-create-view-model.js');

  let finishMount!: () => void;
  const pendingMount = new Promise<void>((resolve) => {
    finishMount = resolve;
  });
  const read = vi.fn((id: string) => ({ id, value: 42 }));
  let constructions = 0;
  let renderedId: string | undefined;

  class CanonicalIdStore extends ViewModelStoreBase {
    override generateId(config: any) {
      return `canonical:${config.id}`;
    }
  }

  class ResourceVM extends ViewModelBase<{}> {
    constructor(params: ConstructorParameters<typeof ViewModelBase<{}>>[0]) {
      super(params);
      constructions += 1;
    }

    protected willMount() {
      return pendingMount;
    }
  }

  const store = new CanonicalIdStore({ resource: { read } });
  const Component = () => {
    const model = useCreateViewModel(ResourceVM, {}, { id: 'requested-ssr-vm' });
    renderedId = model.id;
    return (
      <span>
        {model.id}:{String((model.vm.data as { value: number }).value)}
      </span>
    );
  };
  const previousMode = viewModelsConfig.mode;

  try {
    viewModelsConfig.mode = 'ssr';
    queueMicrotask(() => finishMount());
    const html = await renderToStringAsync(
      () => (
        <ViewModelsProvider value={store}>
          <Component />
        </ViewModelsProvider>
      ),
      { timeoutMs: 1000 },
    );

    expect(html).toContain('canonical:requested-ssr-vm');
    expect(html).toContain('42');
    expect(read).toHaveBeenCalledTimes(1);
    expect(read).toHaveBeenCalledWith('canonical:requested-ssr-vm');
    expect(constructions).toBe(1);
    expect(renderedId).toBe('canonical:requested-ssr-vm');
  } finally {
    finishMount();
    viewModelsConfig.mode = previousMode;
  }
});
