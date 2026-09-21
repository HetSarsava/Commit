import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../common/auth.guard';
import { AuthenticatedRequest } from '../common/auth.types';
import { CreateQuotationDto, QuotationQueryDto, UpdateQuotationDto } from './quotations.dto';
import { QuotationsService } from './quotations.service';

@Controller('quotations')
@UseGuards(AuthGuard)
export class QuotationsController {
  constructor(private readonly quotationsService: QuotationsService) {}

  @Get()
  async list(@Req() request: AuthenticatedRequest, @Query() query: QuotationQueryDto) {
    return { data: await this.quotationsService.findAll(request.user, query) };
  }

  @Get(':id')
  async get(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return { data: await this.quotationsService.findOne(request.user, id) };
  }

  @Post()
  async create(@Req() request: AuthenticatedRequest, @Body() dto: CreateQuotationDto) {
    return { data: await this.quotationsService.create(request.user, dto) };
  }

  @Patch(':id')
  async update(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() dto: UpdateQuotationDto) {
    return { data: await this.quotationsService.update(request.user, id, dto) };
  }

  @Post(':id/accept')
  async accept(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return { data: await this.quotationsService.accept(request.user, id) };
  }

  @Post(':id/reject')
  async reject(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return { data: await this.quotationsService.reject(request.user, id) };
  }
}
