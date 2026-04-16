import {
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { MovementType, ProductEntityType } from '../../../common/constants';

export class CreateKardexEntryDto {
  @IsMongoId()
  @IsNotEmpty()
  productId: string;

  @IsEnum(ProductEntityType)
  productType: ProductEntityType;

  @IsEnum(MovementType)
  type: MovementType;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  unitCost?: number;

  @IsString()
  @IsOptional()
  documentNumber?: string;

  @IsMongoId()
  @IsOptional()
  supplierId?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsNotEmpty()
  reason: string;
}
