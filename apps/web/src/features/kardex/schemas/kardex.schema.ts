import { z } from 'zod';
import { MovementType, ProductEntityType } from '@ethos/shared';

export const createKardexEntrySchema = z
  .object({
    productId: z.string().min(1, 'El producto es requerido'),
    productType: z.nativeEnum(ProductEntityType),
    type: z.nativeEnum(MovementType),
    quantity: z.coerce.number().min(1, 'La cantidad debe ser al menos 1'),
    unitCost: z.coerce.number().min(0).optional(),
    documentNumber: z.string().optional(),
    supplierId: z.string().optional(),
    location: z.string().optional(),
    reason: z.string().min(1, 'El motivo es requerido'),
  })
  .refine(
    (data) => {
      if (data.type === MovementType.IN && (data.unitCost === undefined || data.unitCost === null)) {
        return false;
      }
      return true;
    },
    { message: 'El costo unitario es requerido para entradas', path: ['unitCost'] },
  );

export type CreateKardexEntryFormData = z.infer<typeof createKardexEntrySchema>;
