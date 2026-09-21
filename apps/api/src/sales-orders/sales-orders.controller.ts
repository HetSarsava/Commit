import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../common/auth.guard';
import { AuthenticatedRequest } from '../common/auth.types';
import { CreateSalesOrderDto, SalesOrderQueryDto } from './sales-orders.dto';
import { SalesOrdersService } from './sales-orders.service';

@Controller('sales-orders')
@UseGuards(AuthGuard)
export class SalesOrdersController {
  constructor(private readonly salesOrdersService: SalesOrdersService) {}

  @Get()
  async list(@Req() request: AuthenticatedRequest, @Query() query: SalesOrderQueryDto) {
    return { data: await this.salesOrdersService.findAll(request.user, query) };
  }

  @Get(':id')
  async get(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return { data: await this.salesOrdersService.findOne(request.user, id) };
  }

  @Post()
  async create(@Req() request: AuthenticatedRequest, @Body() dto: CreateSalesOrderDto) {
    return { data: await this.salesOrdersService.createFromQuotation(request.user, dto) };
  }
}
