import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../common/auth.guard';
import { AuthenticatedRequest } from '../common/auth.types';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('audit-events')
@UseGuards(AuthGuard, RolesGuard)
@Roles('Admin')
export class AuditController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Req() request: AuthenticatedRequest, @Query('limit') limit = '50') {
    const take = Math.min(Math.max(Number.parseInt(limit, 10) || 50, 1), 100);
    const events = await this.prisma.auditEvent.findMany({
      where: { organizationId: request.user.organizationId },
      orderBy: { createdAt: 'desc' },
      take,
      include: { user: { select: { name: true, email: true } } },
    });
    return { data: events };
  }
}
