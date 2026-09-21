import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { AuditService } from '../common/audit.service';
import { AuthGuard } from '../common/auth.guard';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [ConfigModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, AuditService],
  exports: [AuthService, AuthGuard],
})
export class AuthModule {}
