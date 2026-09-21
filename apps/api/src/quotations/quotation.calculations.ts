import { Prisma } from '@prisma/client';

export type QuotationCalculationInput = {
  quantity: number;
  unitPrice: string | number | Prisma.Decimal;
  taxRate: string | number | Prisma.Decimal;
};

export type QuotationCalculation = {
  items: Array<{ lineTotal: Prisma.Decimal; taxAmount: Prisma.Decimal }>;
  subtotal: Prisma.Decimal;
  tax: Prisma.Decimal;
  total: Prisma.Decimal;
};

const money = (value: Prisma.Decimal.Value): Prisma.Decimal => new Prisma.Decimal(value).toDecimalPlaces(2);

export function calculateQuotationTotals(items: QuotationCalculationInput[]): QuotationCalculation {
  const calculatedItems = items.map((item) => {
    const lineTotal = money(new Prisma.Decimal(item.unitPrice).mul(item.quantity));
    const taxAmount = money(lineTotal.mul(item.taxRate).div(100));
    return { lineTotal, taxAmount };
  });
  const subtotal = money(calculatedItems.reduce((sum, item) => sum.add(item.lineTotal), new Prisma.Decimal(0)));
  const tax = money(calculatedItems.reduce((sum, item) => sum.add(item.taxAmount), new Prisma.Decimal(0)));
  return { items: calculatedItems, subtotal, tax, total: money(subtotal.add(tax)) };
}
