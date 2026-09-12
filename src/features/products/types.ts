export interface Product {
  id: string;
  name: string;
  category: string | null;
  variant: string | null;
  unitLabel: string;
  priceRupiah: number;
  imageKey: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductInput {
  name: string;
  category?: string;
  variant?: string;
  unitLabel: string;
  priceRupiah: number;
}
