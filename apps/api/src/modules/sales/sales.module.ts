import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';
import { StockMovement, StockMovementSchema } from '../stock/schemas/stock-movement.schema';
import { Product, ProductSchema } from '../products/schemas/product.schema';
import { UnifiedProduct, UnifiedProductSchema } from '../unified-products/schemas/unified-product.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: StockMovement.name, schema: StockMovementSchema },
      { name: Product.name, schema: ProductSchema },
      { name: UnifiedProduct.name, schema: UnifiedProductSchema },
    ]),
  ],
  controllers: [SalesController],
  providers: [SalesService],
})
export class SalesModule {}
