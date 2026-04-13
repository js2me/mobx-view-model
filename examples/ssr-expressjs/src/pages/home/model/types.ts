import type { ItemCardBadge, ItemCardMeta } from '../../../widgets/item-card';

export interface ProductCardInfo {
  title: string;
  price: string;
  originalPrice: string;
  discount?: string;
  badge?: ItemCardBadge | null;
  priceMeta?: ItemCardMeta;
  rating?: string;
  reviewsCount?: string;
  reviewsLabel?: string;
}
