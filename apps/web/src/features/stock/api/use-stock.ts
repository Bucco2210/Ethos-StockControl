'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { stockApi, type CreateMovementData } from './stock.api';
import { notify } from '@/lib/toast';

export function useCreateMovement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateMovementData) => stockApi.createMovement(data),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['stock-movements'] });
      notify.success(`Stock actualizado: ${result.previousStock} → ${result.newStock}`);
    },
  });
}

export function useProductMovements(productId?: string) {
  return useQuery({
    queryKey: ['stock-movements', productId],
    queryFn: () => stockApi.getProductMovements(productId!),
    enabled: !!productId,
  });
}

export function useLastSupplierForProduct(productId?: string, enabled = true) {
  return useQuery({
    queryKey: ['stock-last-supplier', productId],
    queryFn: () => stockApi.getLastSupplier(productId!),
    enabled: !!productId && enabled,
    staleTime: 30_000,
  });
}
