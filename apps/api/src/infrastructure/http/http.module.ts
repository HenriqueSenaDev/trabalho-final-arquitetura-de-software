import { Module, ValidationPipe } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { AccountsModule } from '../../modules/accounts/accounts.module';
import { AuditInterceptor } from './audit.interceptor';
import { DomainErrorFilter } from './domain-error.filter';
import { HealthController } from './health.controller';
import { SessionGuard } from './session.guard';
import { validationErrors } from './validation-errors';

/**
 * Borda HTTP da API: validação, tradução de erros, guarda de sessão e
 * auditoria valem para todos os módulos. Registradas aqui (e não no
 * main.ts) para que os testes montem a aplicação exatamente igual.
 */
@Module({
  imports: [AccountsModule],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        transform: true,
        exceptionFactory: validationErrors,
      }),
    },
    { provide: APP_FILTER, useClass: DomainErrorFilter },
    { provide: APP_GUARD, useClass: SessionGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class HttpModule {}
