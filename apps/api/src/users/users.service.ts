import { Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '../common/auth.types';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: AuthenticatedUser) {
    const users = await this.prisma.user.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { name: 'asc' },
      select: { id: true, organizationId: true, name: true, email: true, role: { select: { name: true } }, createdAt: true },
    });
    return users.map(({ role, ...item }) => ({ ...item, role: role.name }));
  }
}
