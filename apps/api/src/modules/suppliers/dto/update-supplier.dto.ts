import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { SUPPLIER_PARSER_KEYS, SupplierParserKey } from './create-supplier.dto';

export class UpdateSupplierDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  contactName?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsEnum(SUPPLIER_PARSER_KEYS)
  @IsOptional()
  parserKey?: SupplierParserKey;
}
