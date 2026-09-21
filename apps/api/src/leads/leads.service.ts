import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { LeadStatus, Prisma } from '@prisma/client';
import { AuditService } from '../common/audit.service';
import { AuthenticatedUser } from '../common/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLeadDto, LeadQueryDto, UpdateLeadDto } from './leads.dto';

@Injectable()
export class LeadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll(user: AuthenticatedUser, query: LeadQueryDto) {
    const search = query.search?.trim();
    const where: Prisma.LeadWhereInput = {
      organizationId: user.organizationId,
      ...(query.status ? { status: query.status } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { companyName: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { source: { contains: search, mode: 'insensitive' } },
              { requirement: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    return this.prisma.lead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: true,
        assignedUser: { select: { id: true, name: true, email: true } },
        _count: { select: { quotations: true } },
      },
    });
  }

  async findOne(user: AuthenticatedUser, id: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        customer: true,
        assignedUser: { select: { id: true, name: true, email: true } },
        quotations: {
          orderBy: { createdAt: 'desc' },
          include: { customer: true, items: { include: { product: true } }, salesOrder: true },
        },
      },
    });
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  async create(user: AuthenticatedUser, dto: CreateLeadDto) {
    await this.assertRelations(user, dto.customerId, dto.assignedUserId);
    const lead = await this.prisma.lead.create({
      data: {
        organizationId: user.organizationId,
        name: dto.name.trim(),
        companyName: dto.companyName.trim(),
        phone: dto.phone.trim(),
        email: dto.email.trim().toLowerCase(),
        source: dto.source.trim(),
        requirement: dto.requirement.trim(),
        quantity: dto.quantity,
        status: dto.status ?? LeadStatus.NEW,
        customerId: dto.customerId,
        assignedUserId: dto.assignedUserId,
      },
    });
    await this.audit.record({
      userId: user.id,
      organizationId: user.organizationId,
      action: 'LEAD_CREATED',
      entityType: 'Lead',
      entityId: lead.id,
    });
    return lead;
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateLeadDto) {
    await this.getOwnedLead(user, id);
    await this.assertRelations(user, dto.customerId, dto.assignedUserId);

    const data: Prisma.LeadUpdateInput = {
      ...(dto.name === undefined ? {} : { name: dto.name.trim() }),
      ...(dto.companyName === undefined ? {} : { companyName: dto.companyName.trim() }),
      ...(dto.phone === undefined ? {} : { phone: dto.phone.trim() }),
      ...(dto.email === undefined ? {} : { email: dto.email.trim().toLowerCase() }),
      ...(dto.source === undefined ? {} : { source: dto.source.trim() }),
      ...(dto.requirement === undefined ? {} : { requirement: dto.requirement.trim() }),
      ...(dto.quantity === undefined ? {} : { quantity: dto.quantity }),
      ...(dto.status === undefined ? {} : { status: dto.status }),
      ...(dto.customerId === undefined ? {} : { customer: dto.customerId ? { connect: { id: dto.customerId } } : { disconnect: true } }),
      ...(dto.assignedUserId === undefined ? {} : { assignedUser: dto.assignedUserId ? { connect: { id: dto.assignedUserId } } : { disconnect: true } }),
    };

    return this.prisma.lead.update({ where: { id }, data });
  }

  async remove(user: AuthenticatedUser, id: string) {
    await this.getOwnedLead(user, id);
    await this.prisma.lead.delete({ where: { id } });
    return { deleted: true };
  }

  private async getOwnedLead(user: AuthenticatedUser, id: string) {
    const lead = await this.prisma.lead.findFirst({ where: { id, organizationId: user.organizationId } });
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  private async assertRelations(user: AuthenticatedUser, customerId?: string, assignedUserId?: string): Promise<void> {
    if (customerId) {
      const customer = await this.prisma.customer.findFirst({ where: { id: customerId, organizationId: user.organizationId }, select: { id: true } });
      if (!customer) throw new BadRequestException('Customer does not belong to this organization');
    }
    if (assignedUserId) {
      const assignedUser = await this.prisma.user.findFirst({ where: { id: assignedUserId, organizationId: user.organizationId }, select: { id: true } });
      if (!assignedUser) throw new BadRequestException('Assigned user does not belong to this organization');
    }
  }
}
