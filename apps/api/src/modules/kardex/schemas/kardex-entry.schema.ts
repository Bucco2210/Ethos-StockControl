import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { MovementType, ProductEntityType } from '../../../common/constants';

export type KardexEntryDocument = HydratedDocument<KardexEntry>;

@Schema()
export class LotConsumption {
  @Prop({ type: Types.ObjectId, ref: 'StockLot', required: true })
  lotId: Types.ObjectId;

  @Prop({ required: true })
  quantity: number;

  @Prop({ required: true })
  unitCost: number;
}

@Schema({ timestamps: true })
export class KardexEntry {
  @Prop({ type: Types.ObjectId, required: true })
  productId: Types.ObjectId;

  @Prop({ required: true, enum: ProductEntityType })
  productType: ProductEntityType;

  @Prop({ required: true, enum: MovementType })
  type: MovementType;

  // Entry columns
  @Prop({ default: 0 })
  entryQuantity: number;

  @Prop({ default: 0 })
  entryUnitCost: number;

  @Prop({ default: 0 })
  entryAmount: number;

  // Exit columns
  @Prop({ default: 0 })
  exitQuantity: number;

  @Prop({ default: 0 })
  exitUnitCost: number;

  @Prop({ default: 0 })
  exitAmount: number;

  // Balance columns (running totals after this movement)
  @Prop({ required: true })
  balanceQuantity: number;

  @Prop({ required: true })
  balanceAmount: number;

  // Metadata
  @Prop({ trim: true })
  documentNumber?: string;

  @Prop({ type: Types.ObjectId, ref: 'Supplier' })
  supplierId?: Types.ObjectId;

  @Prop({ trim: true })
  location?: string;

  @Prop({ required: true, trim: true })
  reason: string;

  // FIFO traceability
  @Prop({ type: [{ lotId: Types.ObjectId, quantity: Number, unitCost: Number }], default: [] })
  lotConsumptions: LotConsumption[];

  // Backward compatibility
  @Prop({ required: true })
  previousStock: number;

  @Prop({ required: true })
  newStock: number;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  performedBy: Types.ObjectId;
}

export const KardexEntrySchema = SchemaFactory.createForClass(KardexEntry);
KardexEntrySchema.index({ productId: 1, productType: 1, createdAt: -1 });
KardexEntrySchema.index({ productId: 1, productType: 1, createdAt: 1 });
KardexEntrySchema.index({ performedBy: 1 });
KardexEntrySchema.index({ documentNumber: 1 });
KardexEntrySchema.index({ supplierId: 1 });
KardexEntrySchema.index({ createdAt: -1 });
