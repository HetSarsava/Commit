import { Global, Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuthGuard } from './auth.guard';
import { RolesGuard } from './roles.guard';

@Global()
@Module({
  providers: [AuditService, AuthGuard, RolesGuard],
  exports: [AuditService, AuthGuard, RolesGuard],
})
export class CommonModule {}
