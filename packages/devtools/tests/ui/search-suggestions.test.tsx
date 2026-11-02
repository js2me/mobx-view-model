// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ViewModelBase, ViewModelStoreBase } from 'mobx-view-model';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DevtoolsInspector } from '../../src/model/devtools-inspector';
import { DevtoolsSettings } from '../../src/model/devtools-settings';
import { SearchField } from '../../src/ui/devtools-content/search-field';

const resources: Array<() => void> = [];
afterEach(() => {
  cleanup();
  for (const dispose of resources.splice(0).reverse()) dispose();
  localStorage.clear();
  sessionStorage.clear();
});

function mountSearch() {
  class Product {
    displayName = 'Load Testing';
    data = { product: { id: 10082 } };
    permissions = { canEdit: true };
  }
  class ProductVM extends ViewModelBase {
    product = new Product();
  }
  const store = new ViewModelStoreBase();
  store.define({ VM: ProductVM, id: 'a_00002', payload: {} });
  const settings = new DevtoolsSettings({});
  const inspector = new DevtoolsInspector(settings, { push: vi.fn() });
  inspector.setStore(store);
  resources.push(
    () => store.clean(),
    () => settings.destroy(),
    () => inspector.destroy(),
  );
  render(<SearchField search={inspector.search} />);
  return {
    inspector,
    user: userEvent.setup(),
    input: screen.getByRole('textbox', {
      name: 'Search ViewModels and properties',
    }),
  };
}

describe('nested search suggestions from the product. screenshot', () => {
  it('shows property names after typing product. and accepts a nested suggestion', async () => {
    const { user, input, inspector } = mountSearch();
    await user.type(input, 'product.');
    const listbox = await screen.findByRole('listbox', {
      name: 'Search suggestions',
    });
    const options = within(listbox).getAllByRole('option');
    expect(options.map((option) => option.textContent)).toEqual(
      expect.arrayContaining(['displayName', 'data', 'permissions']),
    );
    expect(options.every((option) => option.textContent?.trim())).toBe(true);
    await user.click(within(listbox).getByRole('option', { name: 'data' }));
    expect((input as HTMLInputElement).value).toBe('product.data');
    await user.type(input, '.');
    const nested = screen.getByRole('listbox');
    expect(
      within(nested).getByRole('option', { name: 'product' }),
    ).toBeDefined();
    expect(inspector.search.searchText).toBe('product.data.');
  });
});

it.each(['product.di', "product['di", 'product.permissions.'])(
  'shows nested completions for %s and supports Tab selection',
  async (query) => {
    const { user, input } = mountSearch();
    await user.type(input, query.replaceAll('[', '[['));
    const expected = query.endsWith('.') ? 'canEdit' : 'displayName';
    const listbox = await screen.findByRole('listbox');
    expect(
      within(listbox).getByRole('option', { name: expected }),
    ).toBeDefined();
    await user.keyboard('{Tab}');
    expect((input as HTMLInputElement).value).toContain(expected);
  },
);
