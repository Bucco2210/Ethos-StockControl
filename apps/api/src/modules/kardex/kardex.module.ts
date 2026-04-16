import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { KardexEntry, KardexEntrySchema } from './schemas/kardex-entry.schema';
import { StockLot, StockLotSchema } from './schemas/stock-lot.schema';
import { KardexService } from './kardex.service';
import { KardexController } from './kardex.controller';
import { ProductsModule } from '../products/products.module';
import { UnifiedProductsModule } from '../unified-products/unified-products.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: KardexEntry.name, schema: KardexEntrySchema },
      { name: StockLot.name, schema: StockLotSchema },
    ]),
    ProductsModule,
    UnifiedProductsModule,
  ],
  controllers: [KardexController],
  providers: [KardexService],
  exports: [KardexService],
})
export class KardexModule {}
