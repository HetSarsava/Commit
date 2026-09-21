import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../common/auth.guard';
import { AuthenticatedRequest } from '../common/auth.types';
import { CreateCustomerDto, CustomerQueryDto, UpdateCustomerDto } from './customers.dto';
import { CustomersService } from './customers.service';

@Controller('customers')
@UseGuards(AuthGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  async list(@Req() request: AuthenticatedRequest, @Query() query: CustomerQueryDto) {
    return { data: await this.customersService.findAll(request.user, query) };
  }

  @Get(':id')
  async get(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return { data: await this.customersService.findOne(request.user, id) };
  }

  @Post()
  async create(@Req() request: AuthenticatedRequest, @Body() dto: CreateCustomerDto) {
    return { data: await this.customersService.create(request.user, dto) };
  }

  @Patch(':id')
  async update(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    return { data: await this.customersService.update(request.user, id, dto) };
  }
}
