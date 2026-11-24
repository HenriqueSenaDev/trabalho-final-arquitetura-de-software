import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { catchError, from, map, mergeMap, Observable, throwError } from 'rxjs';
import {
  CredenciaisInvalidasErro,
  RecursoIndisponivelErro,
  RegraVioladaErro,
} from '../compartilhado/dominio/erros';
import { Relogio } from '../compartilhado/portas/relogio';
import {
  ResultadoAuditado,
  TrilhaDeAuditoria,
} from '../compartilhado/portas/trilha-de-auditoria';
import { RequisicaoAutenticada } from './guarda-de-sessao';

const ACAO_AUDITADA = 'acao-auditada';

/** Marca a rota para entrar na trilha de auditoria com o nome da ação. */
export const Auditar = (acao: string) => SetMetadata(ACAO_AUDITADA, acao);

/**
 * Registra identidade, ação, resultado e instante de cada rota marcada
 * (ADR 04). Só guarda identificadores técnicos: o corpo da requisição e a
 * resposta não entram na trilha.
 */
@Injectable()
export class InterceptorDeAuditoria implements NestInterceptor {
  private readonly logger = new Logger(InterceptorDeAuditoria.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly trilha: TrilhaDeAuditoria,
    private readonly relogio: Relogio,
  ) {}

  intercept(contexto: ExecutionContext, proximo: CallHandler): Observable<unknown> {
    const acao = this.reflector.get<string | undefined>(ACAO_AUDITADA, contexto.getHandler());
    if (!acao) {
      return proximo.handle();
    }
    const requisicao = contexto.switchToHttp().getRequest<RequisicaoAutenticada>();
    const idDaRota = typeof requisicao.params?.id === 'string' ? requisicao.params.id : null;

    const registrar = (resultado: ResultadoAuditado, resposta?: unknown) =>
      this.trilha
        .registrar({
          identidade: requisicao.identidade?.titularId ?? titularDaResposta(resposta),
          acao,
          resultado,
          referencia: idDaRota ?? idDaResposta(resposta),
          instante: this.relogio.agora(),
        })
        .catch((erro: unknown) =>
          this.logger.error(`Falha ao gravar auditoria de ${acao}: ${String(erro)}`),
        );

    return proximo.handle().pipe(
      mergeMap((resposta) => from(registrar('SUCESSO', resposta)).pipe(map(() => resposta))),
      catchError((erro: unknown) =>
        from(registrar(classificar(erro))).pipe(mergeMap(() => throwError(() => erro))),
      ),
    );
  }
}

function classificar(erro: unknown): ResultadoAuditado {
  if (erro instanceof RecursoIndisponivelErro || erro instanceof CredenciaisInvalidasErro) {
    return 'NEGADO';
  }
  if (erro instanceof RegraVioladaErro || erro instanceof BadRequestException) {
    return 'RECUSADO';
  }
  return 'ERRO';
}

function idDaResposta(resposta: unknown): string | null {
  const id = (resposta as { id?: unknown } | undefined)?.id;
  return typeof id === 'string' ? id : null;
}

function titularDaResposta(resposta: unknown): string | null {
  const id = (resposta as { titular?: { id?: unknown } } | undefined)?.titular?.id;
  return typeof id === 'string' ? id : null;
}
