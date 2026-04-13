import { declension } from 'yummies/text';
import type { ProductDC } from '../../../shared/api/api';
import type { ProductCardInfo } from './types';

export function mapProductToCard(product: ProductDC): ProductCardInfo {
  const discountPercent = Math.round(
    ((product.originalPrice - product.price) / product.originalPrice) * 100,
  );

  return {
    id: product.id,
    title: product.title,
    imageSrc: product.images?.[0],
    price: `${product.price.toLocaleString('ru-RU')} ₽`,
    originalPrice: `${product.originalPrice.toLocaleString('ru-RU')} ₽`,
    discount: discountPercent > 0 ? `-${discountPercent}%` : undefined,
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
    reviewsCount: product.reviewsCount.toLocaleString('ru-RU'),
    reviewsLabel: declension(product.reviewsCount, [
      'отзыв',
      'отзыва',
      'отзывов',
    ]),
  };
}
