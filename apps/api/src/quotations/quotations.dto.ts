import { QuotationStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDecimal, IsEnum, IsISO8601, IsInt, IsOptional, IsString, Max, MaxLength, Min, ValidateNested } from 'class-validator';

const decimalString = () => Transform(({ value }) => String(value));

export class QuotationItemDto {
  @IsString()
  productId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000000)
  quantity!: number;

  @IsOptional()
  @decimalString()
  @IsDecimal({ decimal_digits: '0,2' })
  unitPrice?: string;

  @IsOptional()
  @decimalString()
  @IsDecimal({ decimal_digits: '0,2' })
  taxRate?: string;
}

export class CreateQuotationDto {
  @IsString()
  customerId!: string;

  @IsOptional()
  @IsString()
  leadId?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => QuotationItemDto)
  items!: QuotationItemDto[];

  @IsOptional()
  @IsISO8601()
  validUntil?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class UpdateQuotationDto {
  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  leadId?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => QuotationItemDto)
  items?: QuotationItemDto[];

  @IsOptional()
  @IsISO8601()
  validUntil?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsOptional()
  @IsEnum(QuotationStatus)
  status?: QuotationStatus;
}

export class QuotationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(QuotationStatus)
  status?: QuotationStatus;
}
