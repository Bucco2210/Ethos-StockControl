import { Injectable } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse: (buf: Buffer) => Promise<{ text: string }> = require('pdf-parse');
import {
  ParsedSupplierList,
  ParsedSupplierRow,
  SupplierParser,
  parseArsPrice,
} from './supplier-parser.interface';

/**
 * ARA Iluminación — .pdf, ARS sin IVA.
 * Organized by product lines (OVALE, GIRARE, KING, NATION, BEST, KANDINSK, WORLD, etc.).
 * Each data row has: description | [variant] | CODE | $price.
 * Pattern used for detection: line ends with `$ X.XXX,XX` and contains a code token.
 */
@Injectable()
export class AraParser implements SupplierParser {
  readonly key = 'ara';

  private readonly KNOWN_LINES = new Set([
    'OVALE',
    'GIRARE',
    'KING',
    'NATION',
    'BEST',
    'KANDINSK',
    'WORLD',
    'MINIWORLD',
    'WATER',
    'HIGHWATER',
    'RAM',
    'RAM.WATER',
  ]);

  private readonly PRICE_RE = /\$\s*([\d.]+,\d{2})\s*$/;
  private readonly CODE_RE = /\b([A-Z]{2,}[-.][A-Z0-9.-]{1,}|[A-Z]+\d+[A-Z0-9-]*)\b/;

  async parse(buffer: Buffer): Promise<ParsedSupplierList> {
    const data = await pdfParse(buffer);
    const lines = data.text.split(/\r?\n/);

    const rows: ParsedSupplierRow[] = [];
    const warnings: Array<{ line?: number; message: string }> = [];
    let currentLine: string | undefined;

    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i].replace(/\s+/g, ' ').trim();
      if (!raw) continue;

      // Detect product-line header (e.g. "OVALE", "GIRARE", etc.)
      const upper = raw.toUpperCase();
      const firstToken = upper.split(' ')[0];
      if (this.KNOWN_LINES.has(firstToken) && !this.PRICE_RE.test(raw)) {
        currentLine = firstToken;
        continue;
      }

      // Try to extract a product row ending with an ARS price
      const priceMatch = raw.match(this.PRICE_RE);
      if (!priceMatch) continue;

      const price = parseArsPrice(priceMatch[1]);
      if (price <= 0) continue;

      const beforePrice = raw.slice(0, raw.length - priceMatch[0].length).trim();
      const codeMatch = beforePrice.match(this.CODE_RE);
      if (!codeMatch) {
        warnings.push({ line: i + 1, message: `Fila con precio sin código: "${raw}"` });
        continue;
      }

      const sku = codeMatch[1].trim();
      const description = beforePrice.replace(codeMatch[0], '').trim();
      const metadata: Record<string, string> = {};
      if (currentLine) metadata.linea = currentLine;

      rows.push({
        supplierSku: sku,
        supplierName: description || sku,
        supplierCategory: currentLine,
        basePrice: price,
        currency: 'ARS',
        metadata: Object.keys(metadata).length ? metadata : undefined,
      });
    }

    return { rows, warnings };
  }
}
