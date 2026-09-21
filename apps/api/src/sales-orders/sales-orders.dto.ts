import { IsOptional, IsString } from 'class-validator';

export class CreateSalesOrderDto {
  @IsString()
  quotationId!: string;
}

export class SalesOrderQueryDto {
  @IsOptional()
  @IsString()
  search?: string;
}
