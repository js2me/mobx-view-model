import { makeObservable, observable } from 'mobx';
import type { ProductDC } from '../../../shared/api/api';
import { loadProducts } from '../../../shared/api/api';
import { VM } from '../../../shared/lib/view-models/vm';
import type { ProductCardInfo } from './types';

function formatPrice(value: number): string {
  return `${value.toLocaleString('ru-RU')} ₽`;
}

function formatCount(value: number): string {
  return value.toLocaleString('ru-RU');
}

function getReviewsLabel(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod100 >= 11 && mod100 <= 19) return 'отзывов';
  if (mod10 === 1) return 'отзыв';
  if (mod10 >= 2 && mod10 <= 4) return 'отзыва';
  return 'отзывов';
}

function mapProductToCard(product: ProductDC): ProductCardInfo {
  const discountPercent = Math.round(
    ((product.originalPrice - product.price) / product.originalPrice) * 100,
  );

  return {
    title: product.title,
    price: formatPrice(product.price),
    originalPrice: formatPrice(product.originalPrice),
    discount: `-${discountPercent}%`,
    badge:
      discountPercent >= 50
        ? { label: 'Распродажа' }
        : discountPercent >= 30
          ? { label: 'Хит продаж' }
          : null,
    priceMeta:
      discountPercent >= 70
        ? { label: 'Стало дешевле', tone: 'success' }
        : undefined,
    rating: String(product.rating),
    reviewsCount: formatCount(product.reviewsCount),
    reviewsLabel: getReviewsLabel(product.reviewsCount),
    slidesCount: product.slidesCount,
    activeSlide: product.slidesCount ? 0 : undefined,
  };
}

export class HomePageVM extends VM {
  products: ProductCardInfo[] = [];

  protected willMount(): void {
    if (this.globals.isClient) {
      loadProducts().then((products) => {
        this.products = products.map(mapProductToCard);
      });
    }

    makeObservable(this, {
      products: observable.ref,
    });

    this.globals.stores.appInfo.setTitle(
      `${this.globals.stores.appInfo.appName} маркетплейс – миллионы товаров по выгодным ценам`,
    );
  }
}
