import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StockMovement, StockMovementSchema } from './schemas/stock-movement.schema';
import { StockService } from './stock.service';
import { StockController } from './stock.controller';
import { ProductsModule } from '../products/products.module';
import { KardexModule } from '../kardex/kardex.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: StockMovement.name, schema: StockMovementSchema },
    ]),
    ProductsModule,
    forwardRef(() => KardexModule),
  ],
  controllers: [StockController],
  providers: [StockService],
  exports: [StockService],
})
export class StockModule {}
