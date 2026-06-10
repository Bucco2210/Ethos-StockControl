import { IsISO8601, IsOptional, IsString } from 'class-validator';

export class QuerySalesDto {
  @IsISO8601()
  @IsOptional()
  from?: string;

  @IsISO8601()
  @IsOptional()
  to?: string;

  @IsString()
  @IsOptional()
  search?: string;
}
