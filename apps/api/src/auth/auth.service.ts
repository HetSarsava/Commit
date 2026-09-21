import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AuditService } from '../common/audit.service';
import { AuthenticatedUser } from '../common/auth.types';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  async login(email: string, password: string): Promise<{ token: string; user: AuthenticatedUser }> {
    const user = await this.prisma.user.findFirst({
      where: { email: email.trim().toLowerCase() },
      include: { role: true },
    });
    const validPassword = user ? await bcrypt.compare(password, user.passwordHash) : false;

    if (!user || !validPassword) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const authUser = this.toAuthUser(user);
    const token = await this.jwtService.signAsync(
      { sub: user.id, organizationId: user.organizationId },
      {
        secret: this.config.getOrThrow<string>('AUTH_SECRET'),
        expiresIn: '7d',
      },
    );

    await this.audit.record({
      userId: user.id,
      organizationId: user.organizationId,
      action: 'LOGIN',
      entityType: 'User',
      entityId: user.id,
    });

    return { token, user: authUser };
  }

  async getCurrentUser(userId: string, organizationId: string): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, organizationId },
      include: { role: true },
    });
    if (!user) {
      throw new UnauthorizedException('Session is no longer valid');
    }
    return this.toAuthUser(user);
  }

  private toAuthUser(user: { id: string; organizationId: string; name: string; email: string; role: { name: string } }): AuthenticatedUser {
    return {
      id: user.id,
      organizationId: user.organizationId,
      name: user.name,
      email: user.email,
      role: user.role.name,
    };
  }

  cookieOptions(): { httpOnly: boolean; sameSite: 'lax'; secure: boolean; maxAge: number; path: string } {
    return {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.config.get<string>('NODE_ENV') === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    };
  }
}
