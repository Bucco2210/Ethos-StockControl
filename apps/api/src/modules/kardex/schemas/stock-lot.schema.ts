import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { ProductEntityType } from '../../../common/constants';

export type StockLotDocument = HydratedDocument<StockLot>;

@Schema({ timestamps: true })
export class StockLot {
  @Prop({ type: Types.ObjectId, required: true })
  productId: Types.ObjectId;

  @Prop({ required: true, enum: ProductEntityType })
  productType: ProductEntityType;

  @Prop({ type: Types.ObjectId, ref: 'Supplier' })
  supplierId?: Types.ObjectId;

  @Prop({ trim: true })
  documentNumber?: string;

  @Prop({ required: true, min: 0 })
  unitCost: number;

  @Prop({ required: true, min: 1 })
  initialQuantity: number;

  @Prop({ required: true, min: 0 })
  remainingQuantity: number;

  @Prop({ trim: true })
  location?: string;
}

export const StockLotSchema = SchemaFactory.createForClass(StockLot);
StockLotSchema.index({ productId: 1, productType: 1, remainingQuantity: 1, createdAt: 1 });
StockLotSchema.index({ productId: 1, productType: 1 });
StockLotSchema.index({ supplierId: 1 });
