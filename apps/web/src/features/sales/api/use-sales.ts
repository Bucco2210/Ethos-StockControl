'use client';

import { useQuery } from '@tanstack/react-query';
import { salesApi, type SalesQuery } from './sales.api';

const KEY = ['sales'];

export function useSalesByProduct(query: SalesQuery = {}) {
  return useQuery({
    queryKey: [...KEY, 'by-product', query],
    queryFn: () => salesApi.getByProduct(query),
  });
}

export function useSalesSummary(query: SalesQuery = {}) {
  return useQuery({
    queryKey: [...KEY, 'summary', query],
    queryFn: () => salesApi.getSummary(query),
  });
}
