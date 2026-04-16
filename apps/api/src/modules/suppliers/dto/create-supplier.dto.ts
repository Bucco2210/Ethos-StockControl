import { IsBoolean, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export const SUPPLIER_PARSER_KEYS = [
  'mentrau',
  'ara',
  'electro_lanus',
  'grass',
  'candil',
  'marana',
] as const;

export type SupplierParserKey = (typeof SUPPLIER_PARSER_KEYS)[number];

export class CreateSupplierDto {
  @IsString()
  @IsNotEmpty()
  name: string;

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
