import * as bcrypt from 'bcryptjs';
import { PrismaClient, Prisma, CustomerStatus, LeadStatus, QuotationStatus, SalesOrderStatus } from '@prisma/client';
import { calculateQuotationTotals } from '../src/quotations/quotation.calculations';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const previous = await prisma.organization.findFirst({ where: { name: 'Amit Uniforms Demo' }, select: { id: true } });
  if (previous) {
    if (process.env.RESET_DEMO_DATA !== '1') {
      console.log('Demo data already exists; skipping seed. Use npm run db:reset to recreate it.');
      return;
    }

    await prisma.$transaction(async (tx) => {
      const [quotations, salesOrders] = await Promise.all([
        tx.quotation.findMany({ where: { organizationId: previous.id }, select: { id: true } }),
        tx.salesOrder.findMany({ where: { organizationId: previous.id }, select: { id: true } }),
      ]);

      await tx.auditEvent.deleteMany({ where: { organizationId: previous.id } });
      await tx.quotationItem.deleteMany({ where: { quotationId: { in: quotations.map((quotation) => quotation.id) } } });
      await tx.salesOrderItem.deleteMany({ where: { salesOrderId: { in: salesOrders.map((order) => order.id) } } });
      await tx.salesOrder.deleteMany({ where: { organizationId: previous.id } });
      await tx.quotation.deleteMany({ where: { organizationId: previous.id } });
      await tx.lead.deleteMany({ where: { organizationId: previous.id } });
      await tx.customer.deleteMany({ where: { organizationId: previous.id } });
      await tx.product.deleteMany({ where: { organizationId: previous.id } });
      await tx.user.deleteMany({ where: { organizationId: previous.id } });
      await tx.role.deleteMany({ where: { organizationId: previous.id } });
      await tx.organization.delete({ where: { id: previous.id } });
    });
  }

  const organization = await prisma.organization.create({ data: { name: 'Amit Uniforms Demo', quotationSequence: 4, salesOrderSequence: 2 } });
  const [adminRole, salesRole] = await Promise.all([
    prisma.role.create({ data: { organizationId: organization.id, name: 'Admin' } }),
    prisma.role.create({ data: { organizationId: organization.id, name: 'Sales' } }),
  ]);
  const [adminHash, salesHash] = await Promise.all([bcrypt.hash('Admin123!', 12), bcrypt.hash('Sales123!', 12)]);
  const [admin, sales] = await Promise.all([
    prisma.user.create({ data: { organizationId: organization.id, name: 'Amit Shah (Demo)', email: 'admin@commit.local', passwordHash: adminHash, roleId: adminRole.id } }),
    prisma.user.create({ data: { organizationId: organization.id, name: 'Ravi Shah (Demo)', email: 'sales@commit.local', passwordHash: salesHash, roleId: salesRole.id } }),
  ]);

  const customers = await Promise.all([
    createCustomer('Priya Mehta', 'Grand Horizon Hotels', '9825001001', 'procurement@grandhorizon.demo', 'Ashram Road', 'Ahmedabad', 'Gujarat', '24DEMO1001X1ZA'),
    createCustomer('Kavita Rao', 'Sunrise Hospital Group', '9825001002', 'purchase@sunrisehospital.demo', 'Ring Road', 'Surat', 'Gujarat', '24DEMO1002X1ZB'),
    createCustomer('Nikhil Desai', 'Metro Facility Services', '9825001003', 'ops@metrofms.demo', 'Alkapuri', 'Vadodara', 'Gujarat', '24DEMO1003X1ZC'),
    createCustomer('Devika Patel', 'Precision Auto Works', '9825001004', 'admin@precisionauto.demo', 'GIDC Estate', 'Rajkot', 'Gujarat', '24DEMO1004X1ZD'),
    createCustomer('Arjun Joshi', 'Coastal Logistics Pvt Ltd', '9825001005', 'stores@coastallogistics.demo', 'Port Road', 'Bhavnagar', 'Gujarat', '24DEMO1005X1ZE'),
    createCustomer('Mira Shah', 'Blue Arc Education Trust', '9825001006', 'office@bluearc.demo', 'University Road', 'Ahmedabad', 'Gujarat', '24DEMO1006X1ZF'),
  ]);

  const products = await Promise.all([
    createProduct('Hotel Executive Shirt', 'AU-HS-001', 'Hotel Uniform', 'Breathable formal shirt for front-office teams.', 'Poly-cotton', '780', 25),
    createProduct('School House Trousers', 'AU-ST-002', 'School Uniform', 'Durable regular-fit trousers for school programmes.', 'Poly-viscose', '620', 40),
    createProduct('Security Guard Jacket', 'AU-SG-003', 'Security Uniform', 'Structured security jacket with reinforced pockets.', 'Polyester twill', '1420', 50),
    createProduct('Corporate Oxford Shirt', 'AU-CO-004', 'Corporate Shirt', 'Easy-care Oxford shirt for office teams.', 'Cotton blend', '890', 25),
    createProduct('Classic Work Trousers', 'AU-TR-005', 'Trousers', 'Straight-cut trousers for corporate and facility teams.', 'Poly-viscose', '720', 30),
    createProduct('Institutional Blazer', 'AU-BL-006', 'Blazer', 'Navy blazer with clean institutional finish.', 'Wool blend', '2450', 15),
    createProduct('Housekeeping Uniform Set', 'AU-HK-007', 'Housekeeping Uniform', 'Shirt and trouser set for hotel housekeeping teams.', 'Poly-cotton', '1120', 30),
    createProduct('Chef Coat and Cap Set', 'AU-CH-008', 'Chef Uniform', 'White chef coat with matching cap.', 'Cotton twill', '740', 15),
  ]);

  const leads = await Promise.all([
    createLead('Priya Mehta', 'Grand Horizon Hotels', '9825001001', 'procurement@grandhorizon.demo', 'IndiaMART', 'Front office shirts and housekeeping sets for new property', 180, LeadStatus.QUOTATION, customers[0].id),
    createLead('Kavita Rao', 'Sunrise Hospital Group', '9825001002', 'purchase@sunrisehospital.demo', 'WhatsApp', 'Scrubs and lab coats for Surat wing', 85, LeadStatus.QUALIFIED, customers[1].id),
    createLead('Nikhil Desai', 'Metro Facility Services', '9825001003', 'ops@metrofms.demo', 'Referral', 'Security jackets for new facility contract', 120, LeadStatus.CONTACTED, customers[2].id),
    createLead('Devika Patel', 'Precision Auto Works', '9825001004', 'admin@precisionauto.demo', 'Google Ads', 'Factory coveralls and work trousers', 240, LeadStatus.NEW),
    createLead('Arjun Joshi', 'Coastal Logistics Pvt Ltd', '9825001005', 'stores@coastallogistics.demo', 'Website', 'Driver uniform sets for regional fleet', 70, LeadStatus.WON, customers[4].id),
    createLead('Mira Shah', 'Blue Arc Education Trust', '9825001006', 'office@bluearc.demo', 'Trade show', 'School blazers and trousers for winter term', 420, LeadStatus.QUOTATION, customers[5].id),
    createLead('Rohan Kulkarni', 'Cedar Grove Residency', '9825001007', 'admin@cedargrove.demo', 'Referral', 'Security and housekeeping uniforms', 55, LeadStatus.CONTACTED),
    createLead('Isha Menon', 'Northstar Clinics', '9825001008', 'ops@northstarclinics.demo', 'Instagram', 'Reception shirts and lab coats', 36, LeadStatus.NEW),
    createLead('Farhan Sheikh', 'Harborline Foods', '9825001009', 'purchase@harborline.demo', 'IndiaMART', 'Chef coats for central kitchen', 48, LeadStatus.QUALIFIED),
    createLead('Neel Joshi', 'Orbit Learning Centre', '9825001010', 'office@orbitlearning.demo', 'Website', 'Corporate shirts for teaching staff', 60, LeadStatus.LOST),
  ]);

  const quotationInputs = [
    { customerId: customers[0].id, leadId: leads[0].id, status: QuotationStatus.ACCEPTED, items: [{ product: products[0], quantity: 120 }, { product: products[6], quantity: 60 }] },
    { customerId: customers[1].id, leadId: leads[1].id, status: QuotationStatus.SENT, items: [{ product: products[3], quantity: 40 }, { product: products[7], quantity: 25 }] },
    { customerId: customers[5].id, leadId: leads[5].id, status: QuotationStatus.ACCEPTED, items: [{ product: products[5], quantity: 90 }, { product: products[1], quantity: 180 }] },
    { customerId: customers[2].id, leadId: leads[2].id, status: QuotationStatus.REJECTED, items: [{ product: products[2], quantity: 80 }, { product: products[4], quantity: 80 }] },
  ];
  const quotations = [];
  for (let index = 0; index < quotationInputs.length; index += 1) {
    quotations.push(await createQuotation(quotationInputs[index], index + 1));
  }

  await createSalesOrder(quotations[0], 1);
  await createSalesOrder(quotations[2], 2);

  const auditRows = [
    { userId: admin.id, action: 'LOGIN', entityType: 'User', entityId: admin.id },
    { userId: sales.id, action: 'LOGIN', entityType: 'User', entityId: sales.id },
    { userId: sales.id, action: 'LEAD_CREATED', entityType: 'Lead', entityId: leads[0].id },
    { userId: sales.id, action: 'CUSTOMER_CREATED', entityType: 'Customer', entityId: customers[0].id },
    { userId: sales.id, action: 'PRODUCT_CREATED', entityType: 'Product', entityId: products[0].id },
    { userId: sales.id, action: 'QUOTATION_CREATED', entityType: 'Quotation', entityId: quotations[0].id },
    { userId: sales.id, action: 'QUOTATION_ACCEPTED', entityType: 'Quotation', entityId: quotations[0].id },
  ];
  await prisma.auditEvent.createMany({ data: auditRows.map((row) => ({ ...row, organizationId: organization.id })) });

  console.log(`Seeded ${organization.name}: 2 users, ${customers.length} customers, ${leads.length} leads, ${products.length} products, ${quotations.length} quotations, 2 sales orders.`);

  async function createCustomer(name: string, companyName: string, phone: string, email: string, address: string, city: string, state: string, gstNumber: string) {
    return prisma.customer.create({ data: { organizationId: organization.id, name, companyName, phone, email, address, city, state, gstNumber, status: CustomerStatus.ACTIVE } });
  }

  async function createProduct(name: string, sku: string, category: string, description: string, fabric: string, price: string, moq: number) {
    return prisma.product.create({ data: { organizationId: organization.id, name, sku, category, description, fabric, price: new Prisma.Decimal(price), moq, active: true } });
  }

  async function createLead(name: string, companyName: string, phone: string, email: string, source: string, requirement: string, quantity: number, status: LeadStatus, customerId?: string) {
    return prisma.lead.create({ data: { organizationId: organization.id, name, companyName, phone, email, source, requirement, quantity, status, customerId, assignedUserId: sales.id } });
  }

  async function createQuotation(input: { customerId: string; leadId: string; status: QuotationStatus; items: Array<{ product: { id: string; price: Prisma.Decimal }; quantity: number }> }, sequence: number) {
    const normalized = input.items.map((item) => ({ quantity: item.quantity, unitPrice: item.product.price, taxRate: new Prisma.Decimal(5) }));
    const totals = calculateQuotationTotals(normalized);
    return prisma.quotation.create({
      data: {
        organizationId: organization.id,
        customerId: input.customerId,
        leadId: input.leadId,
        quotationNumber: `QT-${String(sequence).padStart(6, '0')}`,
        status: input.status,
        subtotal: totals.subtotal,
        tax: totals.tax,
        total: totals.total,
        validUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        notes: 'Demo quotation — prices are for local demonstration only.',
        items: { create: input.items.map((item, index) => ({ productId: item.product.id, quantity: item.quantity, unitPrice: item.product.price, taxRate: new Prisma.Decimal(5), lineTotal: totals.items[index].lineTotal })) },
      },
      include: { items: true },
    });
  }

  async function createSalesOrder(quotation: { id: string; customerId: string; subtotal: Prisma.Decimal; tax: Prisma.Decimal; total: Prisma.Decimal; items: Array<{ productId: string; quantity: number; unitPrice: Prisma.Decimal; taxRate: Prisma.Decimal; lineTotal: Prisma.Decimal }> }, sequence: number) {
    return prisma.salesOrder.create({
      data: {
        organizationId: organization.id,
        customerId: quotation.customerId,
        quotationId: quotation.id,
        orderNumber: `SO-${String(sequence).padStart(6, '0')}`,
        status: SalesOrderStatus.CONFIRMED,
        subtotal: quotation.subtotal,
        tax: quotation.tax,
        total: quotation.total,
        items: { create: quotation.items.map((item) => ({ productId: item.productId, quantity: item.quantity, unitPrice: item.unitPrice, taxRate: item.taxRate, lineTotal: item.lineTotal })) },
      },
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
