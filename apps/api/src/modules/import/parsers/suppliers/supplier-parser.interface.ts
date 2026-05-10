export interface ParsedSupplierRow {
  supplierSku: string;
  supplierName: string;
  supplierDescription?: string;
  supplierCategory?: string;
  color?: string;
  basePrice: number;
  discountPercent?: number;
  currency: 'ARS' | 'USD';
  metadata?: Record<string, string>;
}

export interface ParsedSupplierList {
  rows: ParsedSupplierRow[];
  warnings: Array<{ line?: number; message: string }>;
}

export interface SupplierParserOptions {
  sheetName?: string;
}

export interface SupplierParser {
  readonly key: string;
  parse(buffer: Buffer, options?: SupplierParserOptions): Promise<ParsedSupplierList>;
}

/** Parse ARS price in Argentine format: "$ 63.630,00" → 63630.00 */
export function parseArsPrice(raw: string | number): number {
  if (typeof raw === 'number') return raw;
  if (!raw) return 0;
  const cleaned = String(raw)
    .replace(/\$\s*/g, '')
    .replace(/\s/g, '')
    .trim();
  if (!cleaned) return 0;
  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');
  let normalized = cleaned;
  if (hasComma && hasDot) {
    normalized = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (hasComma) {
    const parts = cleaned.split(',');
    normalized = parts[1]?.length === 3 ? cleaned.replace(',', '') : cleaned.replace(',', '.');
  } else if (hasDot) {
    const parts = cleaned.split('.');
    if (parts.length > 1 && parts[parts.length - 1].length === 3) {
      normalized = cleaned.replace(/\./g, '');
    }
  }
  const n = parseFloat(normalized);
  return isNaN(n) ? 0 : n;
}
