import { IsMongoId, IsOptional, IsString } from 'class-validator';

export class QuerySupplierProductDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsMongoId()
  @IsOptional()
  supplierId?: string;

  @IsString()
  @IsOptional()
  unmapped?: 'true' | 'false';

  @IsOptional()
  page?: number;

  @IsOptional()
  limit?: number;
}
