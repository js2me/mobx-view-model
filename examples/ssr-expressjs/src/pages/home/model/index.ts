import { makeObservable, observable } from 'mobx';
import { loadProducts } from '../../../shared/api/api';
import { VM } from '../../../shared/lib/view-models/vm';
import { mapProductToCard } from './map-product-to-card';
import type { ProductCardInfo } from './types';

const PAGE_SIZE = 100;

export class HomePageVM extends VM {
  isProductsLoaded = false;

  isLoadingMore = false;

  hasMoreProducts = true;

  offset = 0;

  products: ProductCardInfo[] = [];
  firstPageProducts: ProductCardInfo[] = [];
  firstPageHasMoreProducts = true;

  loadProductsChunk = async () => {
    if (this.isLoadingMore || !this.hasMoreProducts) {
      return;
    }

    this.isLoadingMore = true;

    try {
      const { items, hasMore } = await loadProducts({
        limit: PAGE_SIZE,
        offset: this.offset,
      });
      const mappedProducts = items.map(mapProductToCard);

      if (this.offset === 0) {
        this.firstPageProducts = mappedProducts;
        this.firstPageHasMoreProducts = hasMore;
      }

      this.products = [...this.products, ...mappedProducts];
      this.offset += mappedProducts.length;
      this.hasMoreProducts = hasMore;
    } finally {
      this.isLoadingMore = false;
      this.isProductsLoaded = true;
    }
  };

  handleProductsEndReached = () => {
    void this.loadProductsChunk();
  };

  handleProductsTopReached = (isTop: boolean) => {
    if (!isTop || this.firstPageProducts.length === 0) {
      return;
    }

    if (this.products.length <= this.firstPageProducts.length) {
      return;
    }

    this.products = this.firstPageProducts;
    this.offset = this.firstPageProducts.length;
    this.hasMoreProducts = this.firstPageHasMoreProducts;
  };

  protected willMount(): void {
    makeObservable(this, {
      products: observable.ref,
      isProductsLoaded: observable.ref,
      isLoadingMore: observable.ref,
      hasMoreProducts: observable.ref,
      offset: observable.ref,
    });

    if (this.globals.isClient) {
      void this.loadProductsChunk();
    }

    this.globals.stores.appInfo.setTitle(
      `${this.globals.stores.appInfo.appName} маркетплейс – миллионы товаров по выгодным ценам`,
    );
  }
}
