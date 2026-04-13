export interface ProductDC {
  id: number;
  title: string;
  price: number;
  originalPrice: number;
  rating: number;
  reviewsCount: number;
  images?: string[];
}

export interface LoadProductsParams {
  limit: number;
  offset: number;
}

export interface ProductsChunkDC {
  items: ProductDC[];
  hasMore: boolean;
}

export const loadProducts = async ({
  limit,
  offset,
}: LoadProductsParams): Promise<ProductsChunkDC> => {
  const searchParams = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  const response = await fetch(`/api/products?${searchParams.toString()}`);
  return response.json();
};
