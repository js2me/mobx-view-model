import { withViewModel } from 'mobx-view-model';
import { Virtuoso } from 'react-virtuoso';
import { ItemCard } from '../../../widgets/item-card';
import { HomePageVM } from '../model';
import type { ProductCardInfo } from '../model/types';

const CARDS_IN_ROW = 5;

const ProductsLoadingRow = () => (
  <div className="grid grid-cols-5 gap-3 pb-3">
    {Array.from({ length: CARDS_IN_ROW }, (_, i) => (
      <ItemCard loading key={i} />
    ))}
  </div>
);

type VirtualRow =
  | { type: 'products'; items: ProductCardInfo[] }
  | { type: 'loading' };

export const HomePage = withViewModel(HomePageVM, ({ model }) => {
  const productRows: VirtualRow[] = Array.from(
    { length: Math.ceil(model.products.length / CARDS_IN_ROW) },
    (_, rowIndex) =>
      ({
        type: 'products',
        items: model.products.slice(
          rowIndex * CARDS_IN_ROW,
          rowIndex * CARDS_IN_ROW + CARDS_IN_ROW,
        ),
      }) satisfies VirtualRow,
  );
  const rows = [...productRows];

  if (model.isLoadingMore && model.hasMoreProducts) {
    rows.push({ type: 'loading' });
  }

  return (
    <main className="w-full bg-base-bg pt-6 pb-10">
      <section className="mx-auto max-w-[1416px]">
        {model.isProductsLoaded ? (
          <Virtuoso
            computeItemKey={(index, row) => {
              if (row.type === 'loading') {
                return 'loading-row';
              }

              return (
                row.items.map((product) => product.id).join('-') ||
                String(index)
              );
            }}
            data={rows}
            endReached={model.handleProductsEndReached}
            atTopStateChange={model.handleProductsTopReached}
            itemContent={(_, row) =>
              row.type === 'loading' ? (
                <ProductsLoadingRow />
              ) : (
                <div className="grid grid-cols-5 gap-3 pb-3">
                  {row.items.map((product) => (
                    <ItemCard key={product.id} {...product} />
                  ))}
                </div>
              )
            }
            useWindowScroll
          />
        ) : (
          <ProductsLoadingRow />
        )}
      </section>
    </main>
  );
});
