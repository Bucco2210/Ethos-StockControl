import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ImportJob, ImportJobSchema } from './schemas/import-job.schema';
import { ImportService } from './import.service';
import { SupplierImportService } from './supplier-import.service';
import { ImportController } from './import.controller';
import { ExcelParser } from './parsers/excel.parser';
import { MentrauParser } from './parsers/suppliers/mentrau.parser';
import { AraParser } from './parsers/suppliers/ara.parser';
import { ElectroLanusParser } from './parsers/suppliers/electro-lanus.parser';
import { GrassParser } from './parsers/suppliers/grass.parser';
import { CandilParser } from './parsers/suppliers/candil.parser';
import { MaranaParser } from './parsers/suppliers/marana.parser';
import { SupplierParserRegistry } from './parsers/suppliers/supplier-parser.registry';
import { AiParserService } from './parsers/ai/ai-parser.service';
import { RowValidator } from './validators/row.validator';
import { ProductsModule } from '../products/products.module';
import { FamiliesModule } from '../families/families.module';
import { SubfamiliesModule } from '../subfamilies/subfamilies.module';
import { SuppliersModule } from '../suppliers/suppliers.module';
import { SupplierProductsModule } from '../supplier-products/supplier-products.module';
import { MappingSettingsModule } from '../mapping-settings/mapping-settings.module';
import {
  UnifiedProduct,
  UnifiedProductSchema,
} from '../unified-products/schemas/unified-product.schema';
import {
  SupplierProduct,
  SupplierProductSchema,
} from '../supplier-products/schemas/supplier-product.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ImportJob.name, schema: ImportJobSchema },
      { name: UnifiedProduct.name, schema: UnifiedProductSchema },
      { name: SupplierProduct.name, schema: SupplierProductSchema },
    ]),
    ProductsModule,
    FamiliesModule,
    SubfamiliesModule,
    SuppliersModule,
    SupplierProductsModule,
    MappingSettingsModule,
  ],
  controllers: [ImportController],
  providers: [
    ImportService,
    SupplierImportService,
    ExcelParser,
    RowValidator,
    MentrauParser,
    AraParser,
    ElectroLanusParser,
    GrassParser,
    CandilParser,
    MaranaParser,
    SupplierParserRegistry,
    AiParserService,
  ],
})
export class ImportModule {}
