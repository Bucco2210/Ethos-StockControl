import { apiClient } from '@/lib/api-client';

export interface SupplierProduct {
  _id: string;
  supplierId: { _id: string; name: string; code?: string } | string;
  supplierSku: string;
  supplierName: string;
  supplierDescription?: string;
  supplierCategory?: string;
  color?: string;
  basePrice: number;
  discountPercent?: number;
  netCost?: number;
  currency?: 'ARS' | 'USD';
  unifiedProductId?: string | null;
  importJobId?: string;
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface SupplierProductsQuery {
  supplierId?: string;
  search?: string;
  unmapped?: 'true' | 'false';
  page?: number;
  limit?: number;
}

export interface SupplierProductsResponse {
  data: SupplierProduct[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const supplierProductsApi = {
  getAll: async (query: SupplierProductsQuery = {}): Promise<SupplierProductsResponse> => {
    const res = await apiClient.get('/supplier-products', { params: query });
    return res.data;
  },
};
