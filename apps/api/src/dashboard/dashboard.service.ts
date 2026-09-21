import { Injectable } from '@nestjs/common';
import { LeadStatus, QuotationStatus, SalesOrderStatus } from '@prisma/client';
import { AuthenticatedUser } from '../common/auth.types';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(user: AuthenticatedUser) {
    const organizationId = user.organizationId;
    const [leads, customers, activeQuotations, confirmedSalesOrders, productCount, pipeline] = await Promise.all([
      this.prisma.lead.count({ where: { organizationId } }),
      this.prisma.customer.count({ where: { organizationId } }),
      this.prisma.quotation.count({ where: { organizationId, status: { in: [QuotationStatus.DRAFT, QuotationStatus.SENT] } } }),
      this.prisma.salesOrder.count({ where: { organizationId, status: SalesOrderStatus.CONFIRMED } }),
      this.prisma.product.count({ where: { organizationId, active: true } }),
      this.prisma.lead.groupBy({ by: ['status'], where: { organizationId }, _count: { _all: true } }),
    ]);

    const pipelineByStatus = Object.values(LeadStatus).reduce<Record<string, number>>((result, status) => {
      result[status] = pipeline.find((item) => item.status === status)?._count._all ?? 0;
      return result;
    }, {});

    return {
      leads,
      customers,
      activeQuotations,
      confirmedSalesOrders,
      productCount,
      pipeline: pipelineByStatus,
    };
  }
}
