import { Injectable } from '@nestjs/common';
import { SupplierParser } from './supplier-parser.interface';
import { MentrauParser } from './mentrau.parser';
import { AraParser } from './ara.parser';
import { ElectroLanusParser } from './electro-lanus.parser';
import { GrassParser } from './grass.parser';
import { CandilParser } from './candil.parser';
import { MaranaParser } from './marana.parser';

@Injectable()
export class SupplierParserRegistry {
  private readonly parsers: Map<string, SupplierParser>;

  constructor(
    mentrau: MentrauParser,
    ara: AraParser,
    electroLanus: ElectroLanusParser,
    grass: GrassParser,
    candil: CandilParser,
    marana: MaranaParser,
  ) {
    this.parsers = new Map<string, SupplierParser>();
    this.parsers.set(mentrau.key, mentrau);
    this.parsers.set(ara.key, ara);
    this.parsers.set(electroLanus.key, electroLanus);
    this.parsers.set(grass.key, grass);
    this.parsers.set(candil.key, candil);
    this.parsers.set(marana.key, marana);
  }

  get(key?: string | null): SupplierParser | undefined {
    if (!key) return undefined;
    return this.parsers.get(key);
  }

  has(key?: string | null): boolean {
    return !!key && this.parsers.has(key);
  }
}
