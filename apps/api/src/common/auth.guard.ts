import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedRequest, AuthenticatedUser } from './auth.types';

type SessionPayload = {
  sub: string;
  organizationId: string;
};

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = request.cookies?.commit_session ?? this.readBearerToken(request);

    if (!token) {
      throw new UnauthorizedException('Authentication required');
    }

    try {
      const payload = this.jwtService.verify<SessionPayload>(token, {
        secret: this.config.getOrThrow<string>('AUTH_SECRET'),
      });
      const user = await this.prisma.user.findFirst({
        where: {
          id: payload.sub,
          organizationId: payload.organizationId,
        },
        include: { role: true },
      });

      if (!user) {
        throw new UnauthorizedException('Session is no longer valid');
      }

      const authUser: AuthenticatedUser = {
        id: user.id,
        organizationId: user.organizationId,
        name: user.name,
        email: user.email,
        role: user.role.name,
      };
      request.user = authUser;
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Session is invalid or expired');
    }
  }

  private readBearerToken(request: AuthenticatedRequest): string | undefined {
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return undefined;
    }
    return header.slice('Bearer '.length);
  }
}
