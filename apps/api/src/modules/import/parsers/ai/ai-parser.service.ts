import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import * as ExcelJS from 'exceljs';
import {
  ParsedSupplierList,
  ParsedSupplierRow,
} from '../suppliers/supplier-parser.interface';
import {
  SYSTEM_PROMPT,
  EXCEL_USER_PROMPT,
  PDF_USER_PROMPT,
} from './ai-parser.prompts';

interface AiParsedProduct {
  supplierSku: string;
  supplierName: string;
  supplierDescription?: string | null;
  supplierCategory?: string | null;
  color?: string | null;
  basePrice: number;
  discountPercent: number;
  currency: 'ARS' | 'USD';
}

interface AiParseResponse {
  products: AiParsedProduct[];
  warnings: string[];
}

@Injectable()
export class AiParserService {
  private readonly logger = new Logger(AiParserService.name);
  private openai: OpenAI | null = null;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    }
  }

  /** Check whether the AI parser is available (API key configured) */
  isAvailable(): boolean {
    return this.openai !== null;
  }

  /**
   * Parse a supplier file using GPT-4o.
   * Supports Excel (.xlsx/.xls) and PDF files.
   */
  async parse(
    buffer: Buffer,
    mimeType: string,
    supplierName: string,
  ): Promise<ParsedSupplierList> {
    if (!this.openai) {
      throw new Error('OpenAI API key not configured');
    }

    const isPdf =
      mimeType === 'application/pdf' || mimeType.endsWith('.pdf');
    const isExcel =
      mimeType.includes('spreadsheet') ||
      mimeType.includes('excel') ||
      mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      mimeType === 'application/vnd.ms-excel';

    if (isPdf) {
      return this.parsePdf(buffer, supplierName);
    }
    if (isExcel) {
      return this.parseExcel(buffer, supplierName);
    }

    // Try Excel as default for unknown types
    return this.parseExcel(buffer, supplierName);
  }

  /**
   * Parse Excel file: extract data as text table → send to GPT-4o.
   */
  private async parseExcel(
    buffer: Buffer,
    supplierName: string,
  ): Promise<ParsedSupplierList> {
    const tableData = await this.excelToText(buffer);
    if (!tableData) {
      return {
        rows: [],
        warnings: [{ message: 'No se pudieron extraer datos del archivo Excel' }],
      };
    }

    const prompt = EXCEL_USER_PROMPT
      .replace('{supplierName}', supplierName)
      .replace('{tableData}', tableData);

    return this.callGpt(prompt, supplierName);
  }

  /**
   * Parse PDF file: convert pages to images → send to GPT-4o Vision.
   */
  private async parsePdf(
    buffer: Buffer,
    supplierName: string,
  ): Promise<ParsedSupplierList> {
    const images = await this.pdfToImages(buffer);
    if (images.length === 0) {
      return {
        rows: [],
        warnings: [{ message: 'No se pudieron extraer imágenes del PDF' }],
      };
    }

    return this.callGptVision(images, supplierName);
  }

  /**
   * Convert Excel workbook to a pipe-delimited text table for GPT.
   * Picks the sheet with the most data rows.
   */
  private async excelToText(buffer: Buffer): Promise<string | null> {
    const wb = new ExcelJS.Workbook();

    try {
      await wb.xlsx.load(buffer as any);
    } catch {
      // Try xls format via SheetJS fallback
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const XLSX = require('xlsx');
        const xlsWb = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = xlsWb.SheetNames[0];
        const sheet = xlsWb.Sheets[sheetName];
        const jsonData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        if (jsonData.length === 0) return null;

        const lines: string[] = [];
        for (let i = 0; i < Math.min(jsonData.length, 200); i++) {
          const row = jsonData[i];
          if (!row || row.every((c: any) => c === null || c === undefined || c === '')) continue;
          lines.push(row.map((c: any) => String(c ?? '')).join(' | '));
        }
        return lines.length > 0 ? lines.join('\n') : null;
      } catch {
        return null;
      }
    }

    // Find the sheet with most rows
    let bestSheet: ExcelJS.Worksheet | null = null;
    let maxRows = 0;
    for (const ws of wb.worksheets) {
      if (ws.rowCount > maxRows) {
        maxRows = ws.rowCount;
        bestSheet = ws;
      }
    }

    if (!bestSheet || maxRows === 0) return null;

    const lines: string[] = [];
    const colCount = bestSheet.columnCount;

    bestSheet.eachRow({ includeEmpty: false }, (row) => {
      if (lines.length >= 200) return; // Limit to avoid token overflow
      const cells: string[] = [];
      for (let c = 1; c <= colCount; c++) {
        const cell = row.getCell(c);
        cells.push(this.cellToString(cell));
      }
      // Skip completely empty rows
      if (cells.some((c) => c.trim() !== '')) {
        lines.push(cells.join(' | '));
      }
    });

    return lines.length > 0 ? lines.join('\n') : null;
  }

  private cellToString(cell: ExcelJS.Cell): string {
    const v = cell.value;
    if (v === null || v === undefined) return '';
    if (typeof v === 'number') return String(v);
    if (typeof v === 'boolean') return String(v);
    if (v instanceof Date) return v.toISOString().split('T')[0];
    if (typeof v === 'object') {
      if ('richText' in v) return (v as any).richText.map((t: any) => t.text).join('');
      if ('result' in v) return String((v as any).result ?? '');
      if ('text' in v) return String((v as any).text ?? '');
      if ('hyperlink' in v) return String((v as any).text ?? (v as any).hyperlink ?? '');
    }
    return String(v).trim();
  }

  /**
   * Convert PDF buffer to array of base64-encoded PNG images.
   */
  private async pdfToImages(buffer: Buffer): Promise<string[]> {
    try {
      // pdf-to-img is ESM-only, use dynamic import
      const { pdf } = await (Function('return import("pdf-to-img")')() as Promise<typeof import('pdf-to-img')>);

      const images: string[] = [];
      const document = await pdf(buffer, { scale: 2 });

      for await (const image of document) {
        const base64 = Buffer.from(image).toString('base64');
        images.push(base64);
        // Limit to 10 pages to avoid excessive API costs
        if (images.length >= 10) break;
      }

      return images;
    } catch (err) {
      this.logger.error('Error converting PDF to images', err);
      return [];
    }
  }

  /**
   * Call GPT-4o with text content (for Excel).
   */
  private async callGpt(
    userPrompt: string,
    supplierName: string,
  ): Promise<ParsedSupplierList> {
    try {
      const response = await this.openai!.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.1,
        max_tokens: 16000,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return {
          rows: [],
          warnings: [{ message: 'GPT-4o no devolvió contenido' }],
        };
      }

      return this.parseAiResponse(content, supplierName);
    } catch (err: any) {
      this.logger.error('GPT-4o text call failed', err.message);
      return {
        rows: [],
        warnings: [{ message: `Error de OpenAI: ${err.message}` }],
      };
    }
  }

  /**
   * Call GPT-4o Vision with images (for PDF).
   */
  private async callGptVision(
    base64Images: string[],
    supplierName: string,
  ): Promise<ParsedSupplierList> {
    try {
      const imageContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] =
        base64Images.map((img) => ({
          type: 'image_url' as const,
          image_url: {
            url: `data:image/png;base64,${img}`,
            detail: 'high' as const,
          },
        }));

      const userPrompt = PDF_USER_PROMPT
        .replace('{supplierName}', supplierName)
        .replace('{pageCount}', String(base64Images.length));

      const response = await this.openai!.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              { type: 'text', text: userPrompt },
              ...imageContent,
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 16000,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return {
          rows: [],
          warnings: [{ message: 'GPT-4o Vision no devolvió contenido' }],
        };
      }

      return this.parseAiResponse(content, supplierName);
    } catch (err: any) {
      this.logger.error('GPT-4o Vision call failed', err.message);
      return {
        rows: [],
        warnings: [{ message: `Error de OpenAI Vision: ${err.message}` }],
      };
    }
  }

  /**
   * Parse and validate the JSON response from GPT-4o.
   */
  private parseAiResponse(
    raw: string,
    supplierName: string,
  ): ParsedSupplierList {
    const warnings: Array<{ line?: number; message: string }> = [];

    // Clean response: remove markdown code fences if present
    let cleaned = raw.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
    }

    let parsed: AiParseResponse;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      this.logger.error('Failed to parse GPT response as JSON', cleaned.slice(0, 500));
      return {
        rows: [],
        warnings: [{ message: 'La respuesta de GPT-4o no es JSON válido' }],
      };
    }

    if (!parsed.products || !Array.isArray(parsed.products)) {
      return {
        rows: [],
        warnings: [{ message: 'La respuesta de GPT-4o no contiene un array de productos' }],
      };
    }

    // Add AI warnings
    if (parsed.warnings?.length) {
      for (const w of parsed.warnings) {
        warnings.push({ message: `[IA] ${w}` });
      }
    }

    // Validate and convert products
    const rows: ParsedSupplierRow[] = [];
    for (let i = 0; i < parsed.products.length; i++) {
      const p = parsed.products[i];

      // Basic validation
      if (!p.supplierSku && !p.supplierName) {
        warnings.push({
          line: i + 1,
          message: `Producto ${i + 1} sin SKU ni nombre — ignorado`,
        });
        continue;
      }

      const basePrice = typeof p.basePrice === 'number' ? p.basePrice : parseFloat(String(p.basePrice));
      if (isNaN(basePrice) || basePrice < 0) {
        warnings.push({
          line: i + 1,
          message: `Producto "${p.supplierSku || p.supplierName}" con precio inválido: ${p.basePrice}`,
        });
        continue;
      }

      const discount = typeof p.discountPercent === 'number' ? p.discountPercent : 0;
      const currency = p.currency === 'USD' ? 'USD' : 'ARS';

      rows.push({
        supplierSku: String(p.supplierSku || p.supplierName).trim(),
        supplierName: String(p.supplierName || p.supplierSku).trim(),
        supplierDescription: p.supplierDescription || undefined,
        supplierCategory: p.supplierCategory || undefined,
        color: p.color || undefined,
        basePrice,
        discountPercent: discount,
        currency,
      });
    }

    if (rows.length === 0 && warnings.length === 0) {
      warnings.push({ message: 'GPT-4o no extrajo ningún producto válido' });
    }

    this.logger.log(
      `AI parser extracted ${rows.length} products for supplier "${supplierName}" (${warnings.length} warnings)`,
    );

    return { rows, warnings };
  }
}
