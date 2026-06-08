import * as XLSX from 'xlsx';
import type { PreviewRow } from '../api/import.api';

type Variant = 'standard' | 'supplier';

const STATUS_LABEL: Record<PreviewRow['status'], string> = {
  valid: 'OK',
  duplicate: 'Duplicado',
  error: 'Con error',
};

export function exportPreviewToExcel(
  rows: PreviewRow[],
  variant: Variant,
  fileBaseName: string,
) {
  const records = rows.map((r) => {
    const d = r.data as Record<string, unknown>;
    const base = {
      '#': r.rowNumber,
      Estado: STATUS_LABEL[r.status],
      Errores: r.errors?.join(' | ') ?? '',
    };

    if (variant === 'supplier') {
      const basePrice = Number(d.basePrice ?? 0);
      const discount = Number(d.discountPercent ?? 0);
      const netCost = basePrice * (1 - discount / 100);
      return {
        ...base,
        Código: d.supplierSku ?? '',
        Nombre: d.supplierName ?? '',
        Descripción: d.supplierDescription ?? '',
        Categoría: d.supplierCategory ?? '',
        'Precio base': basePrice,
        'Descuento %': discount,
        'Costo neto': Number(netCost.toFixed(2)),
      };
    }

    return {
      ...base,
      SKU: d.sku ?? '',
      Nombre: d.name ?? '',
      Descripción: d.description ?? '',
      Familia: d.family ?? '',
      Subfamilia: d.subfamily ?? '',
      Stock: d.stock ?? 0,
      'Stock mínimo': d.stockMin ?? 0,
      'Precio base': d.basePrice ?? 0,
      'Descuento %': d.discountPercent ?? 0,
    };
  });

  const sheet = XLSX.utils.json_to_sheet(records);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, 'Planilla');

  const safeName = fileBaseName.replace(/\.(xlsx|xls)$/i, '') || 'planilla';
  const stamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `${safeName}-${stamp}.xlsx`);
}
