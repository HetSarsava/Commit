import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsDecimal, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

const decimalString = () => Transform(({ value }) => String(value));

export class CreateProductDto {
  @IsString()
  @MaxLength(160)
  name!: string;

  @IsString()
  @MaxLength(64)
  sku!: string;

  @IsString()
  @MaxLength(100)
  category!: string;

  @IsString()
  @MaxLength(500)
  description!: string;

  @IsString()
  @MaxLength(100)
  fabric!: string;

  @decimalString()
  @IsDecimal({ decimal_digits: '0,2' })
  price!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000000)
  moq!: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  sku?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  fabric?: string;

  @IsOptional()
  @decimalString()
  @IsDecimal({ decimal_digits: '0,2' })
  price?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000000)
  moq?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class ProductQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  category?: string;
}
