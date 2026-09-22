import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuditService } from './audit.service';
import { AuthGuard } from './auth.guard';
import { RolesGuard } from './roles.guard';

@Global()
@Module({
  imports: [JwtModule.register({ global: true })],
  providers: [AuditService, AuthGuard, RolesGuard],
  exports: [AuditService, AuthGuard, RolesGuard],
})
export class CommonModule {}
