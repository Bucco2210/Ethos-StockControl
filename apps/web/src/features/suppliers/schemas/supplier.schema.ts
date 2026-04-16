import { z } from 'zod';

export const SUPPLIER_PARSER_OPTIONS = [
  { value: 'mentrau', label: 'MENTRAU (Von Derk) — Excel USD' },
  { value: 'ara', label: 'ARA Iluminación — PDF' },
  { value: 'electro_lanus', label: 'Electro Lanus — Excel ARS/USD' },
  { value: 'grass', label: 'GRASS — Excel ARS con IVA' },
  { value: 'candil', label: 'Candil Iluminación — Excel con fórmulas' },
  { value: 'marana', label: 'Maraña — PDF' },
] as const;

export type SupplierParserKey = (typeof SUPPLIER_PARSER_OPTIONS)[number]['value'];

export const supplierSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  code: z.string().optional(),
  contactName: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z
    .string()
    .regex(/^[0-9+\-()\s]*$/, 'El teléfono solo puede contener números')
    .optional()
    .or(z.literal('')),
  address: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
  parserKey: z
    .enum(['mentrau', 'ara', 'electro_lanus', 'grass', 'candil', 'marana'])
    .optional()
    .or(z.literal('')),
});

export type SupplierFormData = z.infer<typeof supplierSchema>;

export interface Supplier {
  _id: string;
  name: string;
  code?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  isActive: boolean;
  parserKey?: SupplierParserKey;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}
