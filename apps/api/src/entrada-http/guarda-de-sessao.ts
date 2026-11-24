import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  Injectable,
  Logger,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { Relogio } from '../compartilhado/portas/relogio';
import { TrilhaDeAuditoria } from '../compartilhado/portas/trilha-de-auditoria';
import {
  ContratoAcessoConta,
  IdentidadeAutenticada,
} from '../modulos/acesso-conta/contrato';

export type RequisicaoAutenticada = Request & { identidade?: IdentidadeAutenticada };

const ROTA_PUBLICA = 'rota-publica';

/** Marca a rota como acessível sem sessão (login e verificação de saúde). */
export const Publico = () => SetMetadata(ROTA_PUBLICA, true);

/**
 * Entrada HTTP (C3): toda rota exige sessão válida, salvo as marcadas com
 * @Publico. A identidade autenticada define o titular da operação (ADR 04).
 *
 * A guarda roda antes do interceptor de auditoria, então ela mesma registra
 * as tentativas sem sessão válida. A referência é o padrão da rota
 * (`GET /consultas/:id`), sem identificadores nem conteúdo.
 */
@Injectable()
export class GuardaDeSessao implements CanActivate {
  private readonly logger = new Logger(GuardaDeSessao.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly acessoConta: ContratoAcessoConta,
    private readonly trilha: TrilhaDeAuditoria,
    private readonly relogio: Relogio,
  ) {}

  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    const publica = this.reflector.getAllAndOverride<boolean>(ROTA_PUBLICA, [
      contexto.getHandler(),
      contexto.getClass(),
    ]);
    if (publica) {
      return true;
    }

    const requisicao = contexto.switchToHttp().getRequest<RequisicaoAutenticada>();
    const [esquema, token] = (requisicao.headers.authorization ?? '').split(' ');
    const identidade =
      esquema === 'Bearer' && token ? await this.acessoConta.validarSessao(token) : null;
    if (!identidade) {
      await this.registrarTentativaSemSessao(requisicao);
      throw new UnauthorizedException('Sessão inválida ou encerrada.');
    }

    requisicao.identidade = identidade;
    return true;
  }

  private async registrarTentativaSemSessao(requisicao: Request): Promise<void> {
    const rota = (requisicao.route as { path?: unknown } | undefined)?.path;
    try {
      await this.trilha.registrar({
        identidade: null,
        acao: 'sessao.validar',
        resultado: 'NEGADO',
        referencia: `${requisicao.method} ${typeof rota === 'string' ? rota : requisicao.path}`,
        instante: this.relogio.agora(),
      });
    } catch (erro) {
      this.logger.error(`Falha ao gravar auditoria de sessão inválida: ${String(erro)}`);
    }
  }
}

function identidadeDa(contexto: ExecutionContext): IdentidadeAutenticada {
  const requisicao = contexto.switchToHttp().getRequest<RequisicaoAutenticada>();
  if (!requisicao.identidade) {
    throw new UnauthorizedException('Sessão inválida ou encerrada.');
  }
  return requisicao.identidade;
}

/** Injeta no controller o titular resolvido pela guarda, nunca o enviado pelo cliente. */
export const TitularAutenticado = createParamDecorator(
  (_dados: unknown, contexto: ExecutionContext): string => identidadeDa(contexto).titularId,
);

/** Identidade completa (titular e sessão), para as rotas de sessões. */
export const SessaoAutenticada = createParamDecorator(
  (_dados: unknown, contexto: ExecutionContext): IdentidadeAutenticada => identidadeDa(contexto),
);
