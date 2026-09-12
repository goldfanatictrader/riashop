export interface Customer {
  id: string;
  name: string;
  whatsappNumber: string | null;
  address: string | null;
  note: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerInput {
  name: string;
  whatsappNumber?: string;
  address?: string;
  note?: string;
}
