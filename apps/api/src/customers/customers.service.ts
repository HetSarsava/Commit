import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../common/audit.service';
import { AuthenticatedUser } from '../common/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto, CustomerQueryDto, UpdateCustomerDto } from './customers.dto';

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll(user: AuthenticatedUser, query: CustomerQueryDto) {
    const search = query.search?.trim();
    const where: Prisma.CustomerWhereInput = {
      organizationId: user.organizationId,
      ...(search
        ? {
            OR: [
              { companyName: { contains: search, mode: 'insensitive' } },
              { name: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { gstNumber: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    return this.prisma.customer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { leads: true, quotations: true, salesOrders: true } },
      },
    });
  }

  async findOne(user: AuthenticatedUser, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        leads: { orderBy: { createdAt: 'desc' }, include: { assignedUser: true } },
        quotations: { orderBy: { createdAt: 'desc' }, include: { items: true, lead: true } },
        salesOrders: { orderBy: { createdAt: 'desc' }, include: { items: true, quotation: true } },
      },
    });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  async create(user: AuthenticatedUser, dto: CreateCustomerDto) {
    const customer = await this.prisma.customer.create({
      data: {
        organizationId: user.organizationId,
        name: dto.name.trim(),
        companyName: dto.companyName.trim(),
        phone: dto.phone.trim(),
        email: dto.email.trim().toLowerCase(),
        address: dto.address.trim(),
        city: dto.city.trim(),
        state: dto.state.trim(),
        gstNumber: dto.gstNumber?.trim() || null,
        status: dto.status,
      },
    });
    await this.audit.record({
      userId: user.id,
      organizationId: user.organizationId,
      action: 'CUSTOMER_CREATED',
      entityType: 'Customer',
      entityId: customer.id,
    });
    return customer;
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateCustomerDto) {
    await this.assertExists(user, id);
    return this.prisma.customer.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.name === undefined ? {} : { name: dto.name.trim() }),
        ...(dto.companyName === undefined ? {} : { companyName: dto.companyName.trim() }),
        ...(dto.phone === undefined ? {} : { phone: dto.phone.trim() }),
        ...(dto.email === undefined ? {} : { email: dto.email.trim().toLowerCase() }),
        ...(dto.address === undefined ? {} : { address: dto.address.trim() }),
        ...(dto.city === undefined ? {} : { city: dto.city.trim() }),
        ...(dto.state === undefined ? {} : { state: dto.state.trim() }),
        ...(dto.gstNumber === undefined ? {} : { gstNumber: dto.gstNumber.trim() || null }),
      },
    });
  }

  private async assertExists(user: AuthenticatedUser, id: string): Promise<void> {
    const exists = await this.prisma.customer.findFirst({ where: { id, organizationId: user.organizationId }, select: { id: true } });
    if (!exists) throw new NotFoundException('Customer not found');
  }
}
