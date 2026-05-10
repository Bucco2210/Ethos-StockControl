import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import {
  ParsedSupplierList,
  ParsedSupplierRow,
  SupplierParser,
  SupplierParserOptions,
} from './supplier-parser.interface';

/**
 * Candil Iluminación S.R.L. — usa la hoja "IMPORTACION" (datos limpios).
 * Layout: fila 1 headers, fila 2+ productos.
 * A=sku, B=name, C=color, D=basePrice, E=ean, F=id duplicado (ignorar).
 */
@Injectable()
export class CandilParser implements SupplierParser {
  readonly key = 'candil';

  async parse(buffer: Buffer, options?: SupplierParserOptions): Promise<ParsedSupplierList> {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer as any);

    const ws = this.pickSheet(wb, options?.sheetName);
    if (!ws) {
      return {
        rows: [],
        warnings: [
          {
            message:
              'No se encontró la hoja "IMPORTACION". Hojas disponibles: ' +
              wb.worksheets.map((w) => w.name).join(', '),
          },
        ],
      };
    }

    const rows: ParsedSupplierRow[] = [];
    const warnings: Array<{ line?: number; message: string }> = [];
    const lastRow = Math.max(ws.rowCount, ws.actualRowCount ?? 0);

    for (let r = 2; r <= lastRow; r++) {
      const row = ws.getRow(r);
      const sku = this.cellText(row.getCell(1));
      const name = this.cellText(row.getCell(2));
      const color = this.cellText(row.getCell(3));
      const price = this.toNumber(row.getCell(4).value);
      const ean = this.cellText(row.getCell(5));

      if (!sku) continue;
      if (price <= 0) {
        warnings.push({ line: r, message: `Precio no disponible para ${sku}` });
        continue;
      }

      const metadata: Record<string, string> = {};
      if (ean) metadata.ean = ean;

      rows.push({
        supplierSku: sku.trim(),
        supplierName: name || sku.trim(),
        supplierDescription: name || undefined,
        color: color || undefined,
        basePrice: price,
        currency: 'ARS',
        metadata: Object.keys(metadata).length ? metadata : undefined,
      });
    }

    if (rows.length === 0) {
      warnings.unshift({
        message: `La hoja "${ws.name}" no contiene filas de producto válidas`,
      });
    }

    return { rows, warnings };
  }

  private pickSheet(wb: ExcelJS.Workbook, forcedName?: string): ExcelJS.Worksheet | undefined {
    if (forcedName) {
      const forced = wb.getWorksheet(forcedName);
      if (forced) return forced;
    }
    return wb.worksheets.find((w) => /^importaci[oó]n$/i.test(w.name.trim()));
  }

  private cellText(cell: ExcelJS.Cell): string {
    const v = cell.value;
    if (v === null || v === undefined) return '';
    if (typeof v === 'object') {
      if ('richText' in v) return (v as any).richText.map((t: any) => t.text).join('').trim();
      if ('result' in v) return String((v as any).result ?? '').trim();
      if ('text' in v) return String((v as any).text ?? '').trim();
      if ('hyperlink' in v) return String((v as any).text ?? (v as any).hyperlink ?? '').trim();
    }
    return String(v).trim();
  }

  private toNumber(v: any): number {
    if (v === null || v === undefined) return 0;
    if (typeof v === 'number') return v;
    if (typeof v === 'object') {
      if ('result' in v) return this.toNumber((v as any).result);
      if ('text' in v) return this.toNumber((v as any).text);
    }
    const n = parseFloat(String(v).replace(/[^\d.,-]/g, '').replace(',', '.'));
    return isNaN(n) ? 0 : n;
  }
}
