import { IsEnum, IsMongoId, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { MovementType } from '../../../common/constants';

export class CreateMovementDto {
  @IsMongoId()
  @IsNotEmpty()
  productId: string;

  @IsEnum(MovementType)
  type: MovementType;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsString()
  @IsNotEmpty()
  reason: string;

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
}
