import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../common/auth.guard';
import { AuthenticatedRequest } from '../common/auth.types';
import { CreateLeadDto, LeadQueryDto, UpdateLeadDto } from './leads.dto';
import { LeadsService } from './leads.service';

@Controller('leads')
@UseGuards(AuthGuard)
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get()
  async list(@Req() request: AuthenticatedRequest, @Query() query: LeadQueryDto) {
    return { data: await this.leadsService.findAll(request.user, query) };
  }

  @Get(':id')
  async get(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return { data: await this.leadsService.findOne(request.user, id) };
  }

  @Post()
  async create(@Req() request: AuthenticatedRequest, @Body() dto: CreateLeadDto) {
    return { data: await this.leadsService.create(request.user, dto) };
  }

  @Patch(':id')
  async update(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() dto: UpdateLeadDto) {
    return { data: await this.leadsService.update(request.user, id, dto) };
  }

  @Delete(':id')
  async remove(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return { data: await this.leadsService.remove(request.user, id) };
  }
}
