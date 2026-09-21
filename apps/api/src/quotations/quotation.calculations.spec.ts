import { Prisma, QuotationStatus } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { calculateQuotationTotals } from './quotation.calculations';
import { QuotationsService } from './quotations.service';
import { SalesOrdersService } from '../sales-orders/sales-orders.service';

const user = { id: 'user-1', organizationId: 'org-1', name: 'Sales Demo', email: 'sales@commit.local', role: 'Sales' };

describe('quotation arithmetic', () => {
  it('calculates line totals without floating-point drift', () => {
    const result = calculateQuotationTotals([{ quantity: 3, unitPrice: '0.10', taxRate: '5' }]);
    expect(result.items[0].lineTotal.toString()).toBe('0.3');
    expect(result.subtotal.toString()).toBe('0.3');
    expect(result.tax.toString()).toBe('0.02');
    expect(result.total.toString()).toBe('0.32');
  });

  it('sums multiple lines and applies tax per line', () => {
    const result = calculateQuotationTotals([
      { quantity: 60, unitPrice: '850', taxRate: '5' },
      { quantity: 25, unitPrice: '1150', taxRate: '5' },
    ]);
    expect(result.subtotal.toString()).toBe('79750');
    expect(result.tax.toString()).toBe('3987.5');
    expect(result.total.toString()).toBe('83737.5');
  });
});

describe('quotation acceptance', () => {
  it('transitions a draft quotation to accepted and records the event', async () => {
    const audit = { record: vi.fn().mockResolvedValue(undefined) };
    const quotation = { id: 'quote-1', organizationId: 'org-1', status: QuotationStatus.DRAFT };
    const tx = {
      quotation: {
        findFirst: vi.fn().mockResolvedValue(quotation),
        update: vi.fn().mockResolvedValue({ ...quotation, status: QuotationStatus.ACCEPTED }),
        findUnique: vi.fn().mockResolvedValue({ ...quotation, status: QuotationStatus.ACCEPTED }),
      },
    };
    const prisma = { $transaction: vi.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)) };
    const service = new QuotationsService(prisma as never, audit as never);

    const accepted = await service.accept(user, quotation.id);
    expect(accepted?.status).toBe(QuotationStatus.ACCEPTED);
    expect(tx.quotation.update).toHaveBeenCalledWith({ where: { id: quotation.id }, data: { status: QuotationStatus.ACCEPTED } });
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'QUOTATION_ACCEPTED' }), tx);
  });
});

describe('sales order conversion', () => {
  it('copies quotation items and totals into one confirmed order', async () => {
    const audit = { record: vi.fn().mockResolvedValue(undefined) };
    const quotation = {
      id: 'quote-1', organizationId: 'org-1', customerId: 'customer-1', status: QuotationStatus.ACCEPTED,
      subtotal: new Prisma.Decimal('100'), tax: new Prisma.Decimal('5'), total: new Prisma.Decimal('105'),
      items: [{ productId: 'product-1', quantity: 2, unitPrice: new Prisma.Decimal('50'), taxRate: new Prisma.Decimal('5'), lineTotal: new Prisma.Decimal('100') }],
    };
    const tx = {
      quotation: { findFirst: vi.fn().mockResolvedValue(quotation) },
      salesOrder: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: 'order-1', orderNumber: 'SO-000001', items: quotation.items }),
      },
      organization: { update: vi.fn().mockResolvedValue({ salesOrderSequence: 1 }) },
    };
    const prisma = { $transaction: vi.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)) };
    const service = new SalesOrdersService(prisma as never, audit as never);

    const order = await service.createFromQuotation(user, { quotationId: quotation.id });
    expect(order.orderNumber).toBe('SO-000001');
    expect(tx.salesOrder.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ customerId: 'customer-1', total: quotation.total }) }));
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'SALES_ORDER_CREATED' }), tx);
  });

  it('returns the existing order on a repeated conversion request', async () => {
    const existing = { id: 'order-1', orderNumber: 'SO-000001' };
    const quotation = { id: 'quote-1', organizationId: 'org-1', customerId: 'customer-1', status: QuotationStatus.ACCEPTED, subtotal: new Prisma.Decimal(1), tax: new Prisma.Decimal(0), total: new Prisma.Decimal(1), items: [] };
    const tx = { quotation: { findFirst: vi.fn().mockResolvedValue(quotation) }, salesOrder: { findUnique: vi.fn().mockResolvedValue(existing), create: vi.fn() } };
    const prisma = { $transaction: vi.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)) };
    const service = new SalesOrdersService(prisma as never, { record: vi.fn() } as never);

    const result = await service.createFromQuotation(user, { quotationId: quotation.id });
    expect(result).toBe(existing);
    expect(tx.salesOrder.create).not.toHaveBeenCalled();
  });
});
