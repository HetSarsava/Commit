import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ApiExceptionFilter } from '../src/common/api-exception.filter';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

const integration = process.env.RUN_INTEGRATION_TESTS === '1';

describe.skipIf(!integration)('Commit API integration flow', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let organizationId: string;
  let cookie: string;
  let quotationId: string;

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new ApiExceptionFilter());
    await app.init();
    prisma = app.get(PrismaService);
    const organization = await prisma.organization.create({ data: { name: `Integration ${Date.now()}` } });
    organizationId = organization.id;
    const role = await prisma.role.create({ data: { organizationId, name: 'Sales' } });
    await prisma.user.create({ data: { organizationId, name: 'Integration Sales', email: `integration-${Date.now()}@commit.local`, passwordHash: await bcrypt.hash('Integration123!', 10), roleId: role.id } });
  });

  afterAll(async () => {
    if (organizationId) await prisma.organization.delete({ where: { id: organizationId } });
    await app?.close();
  });

  it('logs in and completes lead → customer → catalogue → quotation → sales order', async () => {
    const seededUser = await prisma.user.findFirstOrThrow({ where: { organizationId } });
    const login = await request(app.getHttpServer()).post('/api/auth/login').send({ email: seededUser.email, password: 'Integration123!' }).expect(201);
    cookie = login.headers['set-cookie'][0];
    expect(login.body.data.user.role).toBe('Sales');

    const customer = await request(app.getHttpServer()).post('/api/customers').set('Cookie', cookie).send({ name: 'Integration Contact', companyName: 'Integration Uniforms', phone: '9000000000', email: 'contact@integration.demo', address: 'Demo Road', city: 'Ahmedabad', state: 'Gujarat' }).expect(201);
    const customerId = customer.body.data.id;
    const productA = await request(app.getHttpServer()).post('/api/products').set('Cookie', cookie).send({ name: 'Integration Shirt', sku: 'INT-SHIRT-001', category: 'Corporate Shirt', description: 'Integration product', fabric: 'Cotton blend', price: '800', moq: 10 }).expect(201);
    const productB = await request(app.getHttpServer()).post('/api/products').set('Cookie', cookie).send({ name: 'Integration Trousers', sku: 'INT-TROUSER-001', category: 'Trousers', description: 'Integration product', fabric: 'Poly-viscose', price: '600', moq: 10 }).expect(201);
    const lead = await request(app.getHttpServer()).post('/api/leads').set('Cookie', cookie).send({ name: 'Integration Contact', companyName: 'Integration Uniforms', phone: '9000000000', email: 'contact@integration.demo', source: 'Integration', requirement: 'Shirts and trousers', quantity: 25, customerId }).expect(201);
    const quotation = await request(app.getHttpServer()).post('/api/quotations').set('Cookie', cookie).send({ customerId, leadId: lead.body.data.id, items: [{ productId: productA.body.data.id, quantity: 2, unitPrice: '800', taxRate: '5' }, { productId: productB.body.data.id, quantity: 3, unitPrice: '600', taxRate: '5' }] }).expect(201);
    quotationId = quotation.body.data.id;
    expect(quotation.body.data.subtotal).toBe('3400');
    expect(quotation.body.data.tax).toBe('170');
    expect(quotation.body.data.total).toBe('3570');

    await request(app.getHttpServer()).post(`/api/quotations/${quotationId}/accept`).set('Cookie', cookie).expect(201);
    const order = await request(app.getHttpServer()).post('/api/sales-orders').set('Cookie', cookie).send({ quotationId }).expect(201);
    expect(order.body.data.orderNumber).toMatch(/^SO-\d{6}$/);
    expect(order.body.data.customerId).toBe(customerId);
    expect(order.body.data.items).toHaveLength(2);
    expect(order.body.data.total).toBe('3570');

    const repeated = await request(app.getHttpServer()).post('/api/sales-orders').set('Cookie', cookie).send({ quotationId }).expect(201);
    expect(repeated.body.data.id).toBe(order.body.data.id);
  });

  it('rejects invalid credentials and protects unauthenticated APIs', async () => {
    await request(app.getHttpServer()).post('/api/auth/login').send({ email: 'integration-nope@commit.local', password: 'Wrong123!' }).expect(401);
    await request(app.getHttpServer()).get('/api/leads').expect(401);
  });
});
