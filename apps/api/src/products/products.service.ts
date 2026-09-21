import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../common/audit.service';
import { AuthenticatedUser } from '../common/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto, ProductQueryDto, UpdateProductDto } from './products.dto';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll(user: AuthenticatedUser, query: ProductQueryDto) {
    const search = query.search?.trim();
    return this.prisma.product.findMany({
      where: {
        organizationId: user.organizationId,
        ...(query.category ? { category: query.category } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { sku: { contains: search, mode: 'insensitive' } },
                { category: { contains: search, mode: 'insensitive' } },
                { fabric: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(user: AuthenticatedUser, id: string) {
    const product = await this.prisma.product.findFirst({ where: { id, organizationId: user.organizationId } });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async create(user: AuthenticatedUser, dto: CreateProductDto) {
    const product = await this.prisma.product.create({
      data: {
        organizationId: user.organizationId,
        name: dto.name.trim(),
        sku: dto.sku.trim().toUpperCase(),
        category: dto.category.trim(),
        description: dto.description.trim(),
        fabric: dto.fabric.trim(),
        price: new Prisma.Decimal(dto.price),
        moq: dto.moq,
        active: dto.active ?? true,
      },
    });
    await this.audit.record({
      userId: user.id,
      organizationId: user.organizationId,
      action: 'PRODUCT_CREATED',
      entityType: 'Product',
      entityId: product.id,
    });
    return product;
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateProductDto) {
    await this.assertExists(user, id);
    const data: Prisma.ProductUpdateInput = {
      ...(dto.name === undefined ? {} : { name: dto.name.trim() }),
      ...(dto.sku === undefined ? {} : { sku: dto.sku.trim().toUpperCase() }),
      ...(dto.category === undefined ? {} : { category: dto.category.trim() }),
      ...(dto.description === undefined ? {} : { description: dto.description.trim() }),
      ...(dto.fabric === undefined ? {} : { fabric: dto.fabric.trim() }),
      ...(dto.price === undefined ? {} : { price: new Prisma.Decimal(dto.price) }),
      ...(dto.moq === undefined ? {} : { moq: dto.moq }),
      ...(dto.active === undefined ? {} : { active: dto.active }),
    };
    return this.prisma.product.update({ where: { id }, data });
  }

  private async assertExists(user: AuthenticatedUser, id: string): Promise<void> {
    const product = await this.prisma.product.findFirst({ where: { id, organizationId: user.organizationId }, select: { id: true } });
    if (!product) throw new NotFoundException('Product not found');
  }
}
