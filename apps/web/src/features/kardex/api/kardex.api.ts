import { apiClient } from '@/lib/api-client';
import type { PaginatedResponse, KardexEntry, StockLot, ProductEntityType } from '@ethos/shared';
import type { CreateKardexEntryFormData } from '../schemas/kardex.schema';

export interface KardexQuery {
  productId: string;
  productType: ProductEntityType;
  type?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface KardexSummary {
  balanceQuantity: number;
  balanceAmount: number;
  averageCost: number;
  activeLots: number;
}

export const kardexApi = {
  createEntry: async (data: CreateKardexEntryFormData): Promise<KardexEntry> => {
    const res = await apiClient.post('/kardex/entry', data);
    return res.data;
  },

  getEntries: async (query: KardexQuery): Promise<PaginatedResponse<KardexEntry>> => {
    const res = await apiClient.get('/kardex/entries', { params: query });
    return res.data;
  },

  getLots: async (productId: string, productType: ProductEntityType): Promise<StockLot[]> => {
    const res = await apiClient.get(`/kardex/lots/${productId}`, {
      params: { productType },
    });
    return res.data;
  },

  getSummary: async (productId: string, productType: ProductEntityType): Promise<KardexSummary> => {
    const res = await apiClient.get(`/kardex/summary/${productId}`, {
      params: { productType },
    });
    return res.data;
  },
};
