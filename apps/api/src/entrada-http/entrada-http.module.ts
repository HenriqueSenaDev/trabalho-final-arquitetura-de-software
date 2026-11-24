import { Module, ValidationPipe } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { AcessoContaModule } from '../modulos/acesso-conta/acesso-conta.module';
import { InterceptorDeAuditoria } from './auditoria.interceptor';
import { errosDeValidacao } from './erros-de-validacao';
import { FiltroDeErrosDeDominio } from './filtro-de-erros';
import { GuardaDeSessao } from './guarda-de-sessao';
import { SaudeController } from './saude.controller';

/**
 * Componente Entrada HTTP (C3). Valida o formato da requisição, resolve a
 * sessão, registra a auditoria e traduz erros; os controllers de cada módulo
 * só chamam casos de uso.
 */
@Module({
  imports: [AcessoContaModule],
  controllers: [SaudeController],
  providers: [
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        exceptionFactory: errosDeValidacao,
      }),
    },
    { provide: APP_GUARD, useClass: GuardaDeSessao },
    { provide: APP_INTERCEPTOR, useClass: InterceptorDeAuditoria },
    { provide: APP_FILTER, useClass: FiltroDeErrosDeDominio },
  ],
})
export class EntradaHttpModule {}
