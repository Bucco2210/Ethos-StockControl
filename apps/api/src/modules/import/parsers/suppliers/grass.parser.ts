import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import {
  ParsedSupplierList,
  ParsedSupplierRow,
  SupplierParser,
  SupplierParserOptions,
} from './supplier-parser.interface';

/**
 * GRASS S.R.L. — .xlsx, ARS CON IVA (único proveedor con IVA incluido).
 * Headers row 26, products from row 28.
 * Cols: A name (multiline) | B dimensions | D SKU (multiline) | E price CON IVA.
 * Normalize to price WITHOUT IVA: price / 1.21.
 */
@Injectable()
export class GrassParser implements SupplierParser {
  readonly key = 'grass';
  private readonly IVA_RATE = 1.21;

  async parse(buffer: Buffer, options?: SupplierParserOptions): Promise<ParsedSupplierList> {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer as any);
    const sheetName = options?.sheetName ?? 'Hoja1';
    const ws = wb.getWorksheet(sheetName) ?? wb.worksheets[0];
    if (!ws) return { rows: [], warnings: [{ message: `Hoja no encontrada: ${sheetName}` }] };

    const rows: ParsedSupplierRow[] = [];
    const warnings: Array<{ line?: number; message: string }> = [];

    for (let r = 28; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      const colA = this.cellText(row.getCell(1));
      const colB = this.cellText(row.getCell(2));
      const colD = this.cellText(row.getCell(4));
      const priceConIva = this.toNumber(row.getCell(5).value);

      if (!colD || priceConIva <= 0) continue;

      const linesD = colD
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      if (linesD.length === 0) continue;
      const sku = linesD[linesD.length - 1];
      const commercialName = linesD[0];

      const priceSinIva = Math.round((priceConIva / this.IVA_RATE) * 100) / 100;

      const metadata: Record<string, string> = {};
      if (colB) metadata.dimensiones = colB;
      if (colA) metadata.descripcionExtendida = colA;
      if (commercialName && commercialName !== sku) metadata.nombreComercial = commercialName;

      rows.push({
        supplierSku: sku,
        supplierName: commercialName && commercialName !== sku ? commercialName : colA || sku,
        supplierDescription: colA || undefined,
        basePrice: priceSinIva,
        currency: 'ARS',
        metadata: Object.keys(metadata).length ? metadata : undefined,
      });
    }

    return { rows, warnings };
  }

  private cellText(cell: ExcelJS.Cell): string {
    const v = cell.value;
    if (v === null || v === undefined) return '';
    if (typeof v === 'object') {
      if ('richText' in v) return (v as any).richText.map((t: any) => t.text).join('\n');
      if ('result' in v) return String((v as any).result ?? '');
      if ('text' in v) return String((v as any).text ?? '');
    }
    return String(v);
  }

  private toNumber(v: any): number {
    if (v === null || v === undefined) return 0;
    if (typeof v === 'number') return v;
    if (typeof v === 'object' && 'result' in v) return this.toNumber((v as any).result);
    const n = parseFloat(String(v).replace(/[^\d.,-]/g, '').replace(',', '.'));
    return isNaN(n) ? 0 : n;
  }
}
