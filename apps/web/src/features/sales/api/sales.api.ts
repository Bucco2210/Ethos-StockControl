import { apiClient } from '@/lib/api-client';

export interface SalesByProductRow {
  productId: string;
  sku: string;
  name: string;
  currency: 'ARS' | 'USD';
  quantitySold: number;
  unitCost: number;
  unitSalePrice: number | null;
  marginPercent: number | null;
  marginAmount: number | null;
  totalRevenue: number | null;
  firstSaleAt: string | null;
  lastSaleAt: string | null;
}

export interface SalesSummary {
  totalUnits: number;
  totalMargin: number;
  totalRevenue: number;
  distinctProducts: number;
}

export interface SalesQuery {
  from?: string;
  to?: string;
  search?: string;
}

export const salesApi = {
  getByProduct: async (query: SalesQuery = {}): Promise<SalesByProductRow[]> => {
    const res = await apiClient.get('/sales/by-product', { params: query });
    return res.data;
  },

  getSummary: async (query: SalesQuery = {}): Promise<SalesSummary> => {
    const res = await apiClient.get('/sales/summary', { params: query });
    return res.data;
  },
};
