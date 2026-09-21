import { Injectable } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type AuditInput = {
  userId: string;
  organizationId: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
};

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: AuditInput, client: Prisma.TransactionClient | PrismaClient = this.prisma): Promise<void> {
    await client.auditEvent.create({ data: input });
  }
}
