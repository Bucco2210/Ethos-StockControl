import {
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { MovementType, ProductEntityType } from '../../../common/constants';

export class QueryKardexDto {
  @IsMongoId()
  @IsNotEmpty()
  productId: string;

  @IsEnum(ProductEntityType)
  productType: ProductEntityType;

  @IsEnum(MovementType)
  @IsOptional()
  type?: MovementType;

  @IsString()
  @IsOptional()
  dateFrom?: string;

  @IsString()
  @IsOptional()
  dateTo?: string;

  @IsOptional()
  page?: number;

  @IsOptional()
  limit?: number;
}
