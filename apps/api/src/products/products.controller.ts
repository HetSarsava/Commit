import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../common/auth.guard';
import { AuthenticatedRequest } from '../common/auth.types';
import { CreateProductDto, ProductQueryDto, UpdateProductDto } from './products.dto';
import { ProductsService } from './products.service';

@Controller('products')
@UseGuards(AuthGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  async list(@Req() request: AuthenticatedRequest, @Query() query: ProductQueryDto) {
    return { data: await this.productsService.findAll(request.user, query) };
  }

  @Get(':id')
  async get(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return { data: await this.productsService.findOne(request.user, id) };
  }

  @Post()
  async create(@Req() request: AuthenticatedRequest, @Body() dto: CreateProductDto) {
    return { data: await this.productsService.create(request.user, dto) };
  }

  @Patch(':id')
  async update(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() dto: UpdateProductDto) {
    return { data: await this.productsService.update(request.user, id, dto) };
  }
}
