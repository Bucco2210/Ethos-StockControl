import { Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';
import {
  ParsedSupplierList,
  ParsedSupplierRow,
  SupplierParser,
} from './supplier-parser.interface';

/**
 * Electro Lanus S.R.L. — legacy .xls.
 * Row 0: title | Row 1: empty | Row 2: headers | Row 3+: products
 * Cols: [0] Código | [1] Descripción | [2] General $ (ARS) | [3] General USD
 * Per-row currency: USD if col[3] > 0, else ARS.
 */
@Injectable()
export class ElectroLanusParser implements SupplierParser {
  readonly key = 'electro_lanus';

  async parse(buffer: Buffer): Promise<ParsedSupplierList> {
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    if (!ws) return { rows: [], warnings: [{ message: 'Hoja no encontrada' }] };

    const raw: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
    const rows: ParsedSupplierRow[] = [];
    const warnings: Array<{ line?: number; message: string }> = [];

    for (let i = 3; i < raw.length; i++) {
      const r = raw[i];
      if (!r) continue;
      const sku = r[0] !== null && r[0] !== undefined ? String(r[0]).trim() : '';
      const name = r[1] !== null && r[1] !== undefined ? String(r[1]).trim() : '';
      const priceArs = this.num(r[2]);
      const priceUsd = this.num(r[3]);
      if (!sku || !name) continue;
      if (priceArs <= 0 && priceUsd <= 0) continue;

      const usesUsd = priceUsd > 0;
      rows.push({
        supplierSku: sku,
        supplierName: name,
        basePrice: usesUsd ? priceUsd : priceArs,
        currency: usesUsd ? 'USD' : 'ARS',
      });
    }

    return { rows, warnings };
  }

  private num(v: any): number {
    if (v === null || v === undefined) return 0;
    if (typeof v === 'number') return v;
    const s = String(v).replace(/\s/g, '').replace(/\$/g, '');
    if (!s) return 0;
    const n = parseFloat(s.replace(/,/g, '.'));
    return isNaN(n) ? 0 : n;
  }
}
