import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, QuotationStatus } from '@prisma/client';
import { AuditService } from '../common/audit.service';
import { AuthenticatedUser } from '../common/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { calculateQuotationTotals } from './quotation.calculations';
import { CreateQuotationDto, QuotationItemDto, QuotationQueryDto, UpdateQuotationDto } from './quotations.dto';

@Injectable()
export class QuotationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll(user: AuthenticatedUser, query: QuotationQueryDto) {
    const search = query.search?.trim();
    return this.prisma.quotation.findMany({
      where: {
        organizationId: user.organizationId,
        ...(query.status ? { status: query.status } : {}),
        ...(search
          ? {
              OR: [
                { quotationNumber: { contains: search, mode: 'insensitive' } },
                { customer: { companyName: { contains: search, mode: 'insensitive' } } },
                { customer: { name: { contains: search, mode: 'insensitive' } } },
                { lead: { companyName: { contains: search, mode: 'insensitive' } } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        customer: true,
        lead: true,
        items: { include: { product: true } },
        salesOrder: { select: { id: true, orderNumber: true, status: true } },
      },
    });
  }

  async findOne(user: AuthenticatedUser, id: string) {
    const quotation = await this.prisma.quotation.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        customer: true,
        lead: { include: { assignedUser: true } },
        items: { include: { product: true } },
        salesOrder: { include: { items: { include: { product: true } } } },
      },
    });
    if (!quotation) throw new NotFoundException('Quotation not found');
    return quotation;
  }

  async create(user: AuthenticatedUser, dto: CreateQuotationDto) {
    await this.assertCustomer(user, dto.customerId);
    await this.assertLead(user, dto.leadId, dto.customerId);
    const products = await this.getProducts(user, dto.items);
    const normalizedItems = this.normalizeItems(dto.items, products);
    const calculation = calculateQuotationTotals(normalizedItems);

    return this.prisma.$transaction(async (tx) => {
      const organization = await tx.organization.update({
        where: { id: user.organizationId },
        data: { quotationSequence: { increment: 1 } },
        select: { quotationSequence: true },
      });
      const quotation = await tx.quotation.create({
        data: {
          organizationId: user.organizationId,
          customerId: dto.customerId,
          leadId: dto.leadId,
          quotationNumber: `QT-${String(organization.quotationSequence).padStart(6, '0')}`,
          status: QuotationStatus.DRAFT,
          subtotal: calculation.subtotal,
          tax: calculation.tax,
          total: calculation.total,
          validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
          notes: dto.notes?.trim() || null,
          items: {
            create: normalizedItems.map((item, index) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              taxRate: item.taxRate,
              lineTotal: calculation.items[index].lineTotal,
            })),
          },
        },
        include: { items: { include: { product: true } }, customer: true, lead: true },
      });
      await this.audit.record({
        userId: user.id,
        organizationId: user.organizationId,
        action: 'QUOTATION_CREATED',
        entityType: 'Quotation',
        entityId: quotation.id,
      }, tx);
      return quotation;
    });
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateQuotationDto) {
    const existing = await this.getOwnedQuotation(user, id);
    if (existing.status === QuotationStatus.ACCEPTED) {
      throw new BadRequestException('Accepted quotations cannot be edited');
    }
    if (dto.status && dto.status !== QuotationStatus.DRAFT && dto.status !== QuotationStatus.SENT) {
      throw new BadRequestException('Use the accept or reject action to change quotation status');
    }
    const customerId = dto.customerId ?? existing.customerId;
    const leadId = dto.leadId === undefined ? existing.leadId ?? undefined : dto.leadId;
    await this.assertCustomer(user, customerId);
    await this.assertLead(user, leadId, customerId);

    if (!dto.items) {
      return this.prisma.quotation.update({
        where: { id },
        data: {
          customerId,
          leadId,
          validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
          notes: dto.notes === undefined ? undefined : dto.notes.trim() || null,
          status: dto.status,
        },
        include: { items: { include: { product: true } }, customer: true, lead: true },
      });
    }

    const products = await this.getProducts(user, dto.items);
    const normalizedItems = this.normalizeItems(dto.items, products);
    const calculation = calculateQuotationTotals(normalizedItems);
    return this.prisma.$transaction(async (tx) => {
      await tx.quotationItem.deleteMany({ where: { quotationId: id } });
      return tx.quotation.update({
        where: { id },
        data: {
          customerId,
          leadId,
          validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
          notes: dto.notes === undefined ? undefined : dto.notes.trim() || null,
          status: dto.status,
          subtotal: calculation.subtotal,
          tax: calculation.tax,
          total: calculation.total,
          items: {
            create: normalizedItems.map((item, index) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              taxRate: item.taxRate,
              lineTotal: calculation.items[index].lineTotal,
            })),
          },
        },
        include: { items: { include: { product: true } }, customer: true, lead: true },
      });
    });
  }

  async accept(user: AuthenticatedUser, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const quotation = await tx.quotation.findFirst({ where: { id, organizationId: user.organizationId } });
      if (!quotation) throw new NotFoundException('Quotation not found');
      if (quotation.status === QuotationStatus.REJECTED) throw new BadRequestException('Rejected quotations cannot be accepted');
      if (quotation.status !== QuotationStatus.ACCEPTED) {
        await tx.quotation.update({ where: { id }, data: { status: QuotationStatus.ACCEPTED } });
        await this.audit.record({
          userId: user.id,
          organizationId: user.organizationId,
          action: 'QUOTATION_ACCEPTED',
          entityType: 'Quotation',
          entityId: id,
        }, tx);
      }
      return tx.quotation.findUnique({
        where: { id },
        include: { items: { include: { product: true } }, customer: true, lead: true, salesOrder: true },
      });
    });
  }

  async reject(user: AuthenticatedUser, id: string) {
    const quotation = await this.getOwnedQuotation(user, id);
    if (quotation.status === QuotationStatus.ACCEPTED) throw new BadRequestException('Accepted quotations cannot be rejected');
    return this.prisma.quotation.update({
      where: { id },
      data: { status: QuotationStatus.REJECTED },
      include: { items: { include: { product: true } }, customer: true, lead: true },
    });
  }

  private async getOwnedQuotation(user: AuthenticatedUser, id: string) {
    const quotation = await this.prisma.quotation.findFirst({ where: { id, organizationId: user.organizationId } });
    if (!quotation) throw new NotFoundException('Quotation not found');
    return quotation;
  }

  private async assertCustomer(user: AuthenticatedUser, customerId: string): Promise<void> {
    const customer = await this.prisma.customer.findFirst({ where: { id: customerId, organizationId: user.organizationId }, select: { id: true } });
    if (!customer) throw new BadRequestException('Customer does not belong to this organization');
  }

  private async assertLead(user: AuthenticatedUser, leadId: string | undefined, customerId: string): Promise<void> {
    if (!leadId) return;
    const lead = await this.prisma.lead.findFirst({ where: { id: leadId, organizationId: user.organizationId }, select: { customerId: true } });
    if (!lead) throw new BadRequestException('Lead does not belong to this organization');
    if (lead.customerId && lead.customerId !== customerId) {
      throw new BadRequestException('Quotation customer must match the lead customer');
    }
  }

  private async getProducts(user: AuthenticatedUser, items: QuotationItemDto[]) {
    const productIds = items.map((item) => item.productId);
    if (new Set(productIds).size !== productIds.length) {
      throw new BadRequestException('Each product can only appear once in a quotation');
    }
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, organizationId: user.organizationId, active: true },
    });
    if (products.length !== productIds.length) {
      throw new BadRequestException('One or more products are missing or inactive');
    }
    return products;
  }

  private normalizeItems(items: QuotationItemDto[], products: Array<{ id: string; price: Prisma.Decimal }>) {
    const productPrice = new Map(products.map((product) => [product.id, product.price]));
    return items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: new Prisma.Decimal(item.unitPrice ?? productPrice.get(item.productId) ?? 0),
      taxRate: new Prisma.Decimal(item.taxRate ?? '5'),
    }));
  }
}
