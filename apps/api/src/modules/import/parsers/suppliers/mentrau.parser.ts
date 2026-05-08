import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import {
  ParsedSupplierList,
  ParsedSupplierRow,
  SupplierParser,
  SupplierParserOptions,
} from './supplier-parser.interface';

/**
 * MENTRAU S.A. (Von Derk) — .xlsx, USD sin IVA.
 *
 * The sheet has ~50 rows of commercial info before actual product data.
 * Instead of hardcoding a start row, we auto-detect the data region by
 * scanning for header rows that contain keywords like "Precio", "Color",
 * "Potencia", etc.
 *
 * Pattern that repeats per product group:
 *   - Product family row: col B has short name (e.g. "VK-BORE"), col C has hyperlink
 *   - Header row: col C="Potencia", col I="Precio", col H="Color", etc.
 *   - One or more product data rows: col B has full SKU with dashes, col I has numeric price
 *
 * Categories (ILUMINACIÓN INTERIOR, TECHO, etc.) appear as merged rows spanning all columns.
 */
@Injectable()
export class MentrauParser implements SupplierParser {
  readonly key = 'mentrau';

  /** Keywords that identify a header row (checked case-insensitive) */
  private readonly HEADER_KEYWORDS = ['precio', 'color', 'potencia', 'lúmenes', 'lumenes', 'ip'];

  async parse(buffer: Buffer, options?: SupplierParserOptions): Promise<ParsedSupplierList> {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer as any);
    const sheetName = options?.sheetName ?? 'GENERAL';
    const ws = wb.getWorksheet(sheetName) ?? wb.worksheets[0];
    if (!ws) {
      return { rows: [], warnings: [{ message: `Hoja no encontrada: ${sheetName}` }] };
    }

    // Step 1: find the first header row by scanning for keyword matches
    const dataStartRow = this.findDataStart(ws);
    if (dataStartRow === -1) {
      return {
        rows: [],
        warnings: [{ message: 'No se encontraron encabezados de producto (Precio, Color, Potencia, etc.)' }],
      };
    }

    // Step 2: parse products from the detected start
    const rows: ParsedSupplierRow[] = [];
    const warnings: Array<{ line?: number; message: string }> = [];
    let currentCategory: string | undefined;
    let currentProductFamily: string | undefined;

    for (let r = dataStartRow; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      const colA = this.cellText(row.getCell(1));
      const colB = this.cellText(row.getCell(2));
      const colI = row.getCell(9).value;
      const price = this.toNumber(colI);

      // Skip header rows (contain "Precio", "Potencia", etc.)
      if (this.isHeaderRow(row)) {
        continue;
      }

      // Category row: merged row spanning all columns, uppercase text
      if (colA && /^[A-ZÁÉÍÓÚÑ\s/]+$/.test(colA.trim()) && this.isMergedRow(row)) {
        currentCategory = colA.trim();
        continue;
      }

      // Sub-category row (e.g. "TECHO", "PARED") — same pattern
      if (colA && !price && /^[A-ZÁÉÍÓÚÑ\s]+$/.test(colA.trim())) {
        currentCategory = colA.trim();
        continue;
      }

      // Product family row: col B has short name, col C has hyperlink, col I is NOT a number
      if (colB && !price && this.hasHyperlink(row.getCell(3))) {
        currentProductFamily = colB.trim();
        continue;
      }

      // NOTA rows — skip
      if (colB && colB.startsWith('NOTA:')) {
        continue;
      }

      // Product data row: col B has SKU text, col I has a positive price
      if (colB && price > 0) {
        const metadata: Record<string, string> = {};
        const potencia = this.cellText(row.getCell(3));
        const lumenes = this.cellText(row.getCell(5));
        const tempColor = this.cellText(row.getCell(6));
        const ip = this.cellText(row.getCell(7));
        const color = this.cellText(row.getCell(8));
        const sugerido = this.cellText(row.getCell(11));
        if (potencia) metadata.potencia = potencia;
        if (lumenes) metadata.lumenes = lumenes;
        if (tempColor) metadata.tempColor = tempColor;
        if (ip) metadata.ip = ip;
        if (color) metadata.color = color;
        if (sugerido) metadata.precioSugerido = sugerido;

        const nameParts = [currentCategory, currentProductFamily, color].filter(Boolean);
        const supplierName = nameParts.length > 0
          ? `${colB.trim()} · ${nameParts.join(' · ')}`
          : colB.trim();

        rows.push({
          supplierSku: colB.trim(),
          supplierName,
          supplierCategory: currentCategory,
          color,
          basePrice: price,
          currency: 'USD',
          metadata: Object.keys(metadata).length ? metadata : undefined,
        });
      }
    }

    return { rows, warnings };
  }

  /**
   * Scan the sheet to find the first row that looks like a product header.
   * A header row has cells matching keywords like "Precio", "Color", "Potencia".
   * Returns the row number (1-based) or -1 if not found.
   */
  private findDataStart(ws: ExcelJS.Worksheet): number {
    const limit = Math.min(ws.rowCount, 200); // don't scan forever

    for (let r = 1; r <= limit; r++) {
      if (this.isHeaderRow(ws.getRow(r))) {
        // Return a few rows before the header to catch categories above it
        return Math.max(1, r - 5);
      }
    }

    return -1;
  }

  /**
   * Check if a row is a product header row by looking for keywords.
   * Cells must be short (≤30 chars) to avoid matching paragraphs that
   * happen to mention "precio" in their text.
   * Requires at least 3 keyword matches to avoid false positives.
   */
  private isHeaderRow(row: ExcelJS.Row): boolean {
    let matches = 0;

    for (let c = 1; c <= 11; c++) {
      const text = this.cellText(row.getCell(c)).toLowerCase().trim();
      if (text.length <= 30 && this.HEADER_KEYWORDS.some((kw) => text.includes(kw))) {
        matches++;
      }
    }

    return matches >= 3;
  }

  /**
   * Check if a row is a merged row (all cells after A are type Merge).
   */
  private isMergedRow(row: ExcelJS.Row): boolean {
    let mergeCount = 0;
    for (let c = 2; c <= 6; c++) {
      if (row.getCell(c).type === ExcelJS.ValueType.Merge) {
        mergeCount++;
      }
    }
    return mergeCount >= 3;
  }

  private hasHyperlink(cell: ExcelJS.Cell): boolean {
    const v = cell.value;
    if (v && typeof v === 'object' && 'hyperlink' in v) return true;
    if (cell.type === 5) return true; // ExcelJS ValueType.Hyperlink
    return false;
  }

  private cellText(cell: ExcelJS.Cell): string {
    const v = cell.value;
    if (v === null || v === undefined) return '';
    if (typeof v === 'object') {
      if ('richText' in v) return (v as any).richText.map((t: any) => t.text).join('');
      if ('result' in v) return String((v as any).result ?? '');
      if ('text' in v) return String((v as any).text ?? '');
    }
    return String(v).trim();
  }

  private toNumber(v: any): number {
    if (v === null || v === undefined) return 0;
    if (typeof v === 'number') return v;
    if (typeof v === 'object') {
      if ('result' in v && typeof (v as any).result === 'number') return (v as any).result;
    }
    const n = parseFloat(String(v));
    return isNaN(n) ? 0 : n;
  }
}
