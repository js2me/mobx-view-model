import { renderToString } from '@vue/server-renderer';
import { getObserverTree, observable } from 'mobx';
import {
  ViewModelBase,
  ViewModelStoreBase,
  viewModelsConfig,
} from 'mobx-view-model';
import { expect, it, vi } from 'vitest';
import { createSSRApp, h } from 'vue';
import { ViewModelsProvider, withViewModel } from './index.js';

it('renders request content without DOM prop leakage and disposes request resources', async () => {
  const previousMode = viewModelsConfig.mode;
  viewModelsConfig.mode = 'ssr';
  const state = observable({ label: 'content' });
  const dispose = vi.fn();
  class VM extends ViewModelBase {
    protected willUnmount() {
      dispose();
    }
  }
  const Page = withViewModel(VM, () => h('span', state.label));
  const store = new ViewModelStoreBase();
  try {
    const html = await renderToString(
      createSSRApp(() =>
        h(ViewModelsProvider, { value: store }, () =>
          h(Page, { label: 'private' }),
        ),
      ),
    );
    expect(html).toContain('<span>content</span>');
    expect(html).not.toContain('model=');
    expect(html).not.toContain('label=');
    expect(getObserverTree(state, 'label').observers).toBeUndefined();
  } finally {
    for (const model of store.getAll(VM)) await store.unmount(model);
    store.clean();
    viewModelsConfig.mode = previousMode;
  }
  expect(dispose).toHaveBeenCalledOnce();
});
