import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, QuotationStatus, SalesOrderStatus } from '@prisma/client';
import { AuditService } from '../common/audit.service';
import { AuthenticatedUser } from '../common/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSalesOrderDto, SalesOrderQueryDto } from './sales-orders.dto';

@Injectable()
export class SalesOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll(user: AuthenticatedUser, query: SalesOrderQueryDto) {
    const search = query.search?.trim();
    return this.prisma.salesOrder.findMany({
      where: {
        organizationId: user.organizationId,
        ...(search
          ? {
              OR: [
                { orderNumber: { contains: search, mode: 'insensitive' } },
                { customer: { companyName: { contains: search, mode: 'insensitive' } } },
                { customer: { name: { contains: search, mode: 'insensitive' } } },
                { quotation: { quotationNumber: { contains: search, mode: 'insensitive' } } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        customer: true,
        quotation: { select: { id: true, quotationNumber: true, status: true } },
        items: { include: { product: true } },
      },
    });
  }

  async findOne(user: AuthenticatedUser, id: string) {
    const order = await this.prisma.salesOrder.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        customer: true,
        quotation: { include: { lead: true } },
        items: { include: { product: true } },
      },
    });
    if (!order) throw new NotFoundException('Sales order not found');
    return order;
  }

  async createFromQuotation(user: AuthenticatedUser, dto: CreateSalesOrderDto) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const quotation = await tx.quotation.findFirst({
          where: { id: dto.quotationId, organizationId: user.organizationId },
          include: { items: true },
        });
        if (!quotation) throw new NotFoundException('Quotation not found');
        if (quotation.status !== QuotationStatus.ACCEPTED) {
          throw new BadRequestException('Only accepted quotations can become sales orders');
        }

        const existing = await tx.salesOrder.findUnique({ where: { quotationId: quotation.id }, include: { items: true, customer: true, quotation: true } });
        if (existing) return existing;

        const organization = await tx.organization.update({
          where: { id: user.organizationId },
          data: { salesOrderSequence: { increment: 1 } },
          select: { salesOrderSequence: true },
        });
        const order = await tx.salesOrder.create({
          data: {
            organizationId: user.organizationId,
            customerId: quotation.customerId,
            quotationId: quotation.id,
            orderNumber: `SO-${String(organization.salesOrderSequence).padStart(6, '0')}`,
            status: SalesOrderStatus.CONFIRMED,
            subtotal: quotation.subtotal,
            tax: quotation.tax,
            total: quotation.total,
            items: {
              create: quotation.items.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                taxRate: item.taxRate,
                lineTotal: item.lineTotal,
              })),
            },
          },
          include: { items: true, customer: true, quotation: true },
        });
        await this.audit.record({
          userId: user.id,
          organizationId: user.organizationId,
          action: 'SALES_ORDER_CREATED',
          entityType: 'SalesOrder',
          entityId: order.id,
          metadata: { quotationId: quotation.id, orderNumber: order.orderNumber },
        }, tx);
        return order;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const existing = await this.prisma.salesOrder.findFirst({
          where: { quotationId: dto.quotationId, organizationId: user.organizationId },
          include: { items: true, customer: true, quotation: true },
        });
        if (existing) return existing;
      }
      throw error;
    }
  }
}
