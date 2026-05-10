import { Injectable } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse: (buf: Buffer) => Promise<{ text: string }> = require('pdf-parse');
import {
  ParsedSupplierList,
  ParsedSupplierRow,
  SupplierParser,
} from './supplier-parser.interface';

/**
 * Maraña — .pdf, ARS sin IVA, no product codes (synthetic SKU from name+variant).
 * Categories: LAMPARAS, SERIE LUZ DE CUERO, LAMPARAS DE PIE, PANTALLAS,
 *             COLGANTES, APLIQUES, BARRALES, CANDELABROS.
 * Row pattern: "NAME [VARIANT] $PRICE" (price without decimals, e.g. $81.700).
 */
@Injectable()
export class MaranaParser implements SupplierParser {
  readonly key = 'marana';

  private readonly CATEGORIES = new Set([
    'LAMPARAS',
    'SERIE LUZ DE CUERO',
    'LAMPARAS DE PIE',
    'PANTALLAS',
    'COLGANTES',
    'APLIQUES',
    'BARRALES',
    'CANDELABROS',
  ]);

  private readonly PRICE_RE = /\$\s*([\d.]+)\s*$/;

  async parse(buffer: Buffer): Promise<ParsedSupplierList> {
    const data = await pdfParse(buffer);
    const lines = data.text.split(/\r?\n/);

    const rows: ParsedSupplierRow[] = [];
    const warnings: Array<{ line?: number; message: string }> = [];
    const seenSkus = new Set<string>();
    let currentCategory: string | undefined;

    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i].replace(/\s+/g, ' ').trim();
      if (!raw) continue;

      const upper = raw.toUpperCase();
      if (this.CATEGORIES.has(upper)) {
        currentCategory = upper;
        continue;
      }

      const priceMatch = raw.match(this.PRICE_RE);
      if (!priceMatch) continue;

      const price = this.parseMaranaPrice(priceMatch[1]);
      if (price <= 0) continue;

      const beforePrice = raw.slice(0, raw.length - priceMatch[0].length).trim();
      if (!beforePrice) continue;

      const { name, variant } = this.splitNameVariant(beforePrice);
      const sku = this.buildSku(name, variant);
      if (seenSkus.has(sku)) {
        warnings.push({ line: i + 1, message: `SKU sintético duplicado: ${sku}` });
        continue;
      }
      seenSkus.add(sku);

      const metadata: Record<string, string> = {};
      if (currentCategory) metadata.category = currentCategory;
      if (variant) metadata.variant = variant;

      rows.push({
        supplierSku: sku,
        supplierName: variant ? `${name} ${variant}` : name,
        supplierCategory: currentCategory,
        basePrice: price,
        currency: 'ARS',
        metadata: Object.keys(metadata).length ? metadata : undefined,
      });
    }

    return { rows, warnings };
  }

  private parseMaranaPrice(raw: string): number {
    const n = parseFloat(raw.replace(/\./g, ''));
    return isNaN(n) ? 0 : n;
  }

  // Try to split "NAME VARIANT" — heuristic: if after the first ALL-CAPS token
  // there are lowercase words, those become the variant.
  private splitNameVariant(text: string): { name: string; variant: string } {
    const tokens = text.split(' ');
    let nameEnd = tokens.length;
    for (let i = 1; i < tokens.length; i++) {
      if (tokens[i] !== tokens[i].toUpperCase() || /^[a-z]/.test(tokens[i])) {
        nameEnd = i;
        break;
      }
    }
    const name = tokens.slice(0, nameEnd).join(' ').trim();
    const variant = tokens.slice(nameEnd).join(' ').trim();
    return { name: name || text.trim(), variant };
  }

  private buildSku(name: string, variant: string): string {
    const parts = [name.trim()];
    if (variant.trim()) parts.push(variant.trim());
    return parts.join('_').toUpperCase().replace(/\s+/g, '_');
  }
}
