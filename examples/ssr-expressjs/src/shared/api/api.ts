export interface ProductDC {
  id: number;
  title: string;
  price: number;
  originalPrice: number;
  rating: number;
  reviewsCount: number;
  images?: string[];
}

export const loadProducts = async (): Promise<ProductDC[]> => {
  const response = await fetch('/api/products');
  return response.json();
};
