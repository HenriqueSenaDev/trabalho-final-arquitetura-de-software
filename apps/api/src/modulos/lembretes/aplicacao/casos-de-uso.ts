import { FuncionalidadeIndisponivelErro } from '../../../compartilhado/dominio/erros';
import { UnidadeDeTrabalho } from '../../../compartilhado/portas/unidade-de-trabalho';
import { Lembrete } from '../dominio/lembrete';
import { OcorrenciaDeDose } from '../dominio/ocorrencia-de-dose';
import { RepositorioLembretes } from '../portas/repositorio-lembretes';
import { RepositorioOcorrencias } from '../portas/repositorio-ocorrencias';
import { RepositorioRespostasDose } from '../portas/repositorio-respostas-dose';
import { PublicadorEventos } from '../portas/eventos';

export interface ComandoConfigurarLembrete {
  origemId: string;
  tipoOrigem: string;
  antecedenciaMinutos: number;
}

export interface FiltrosOcorrencias {
  tratamentoId?: string;
}

export class ConfigurarLembrete {
  constructor(
    readonly lembretes: RepositorioLembretes,
    readonly unidade: UnidadeDeTrabalho,
    readonly eventos: PublicadorEventos,
  ) {}

  async executar(_comando: ComandoConfigurarLembrete, _titularId: string): Promise<Lembrete> {
    throw new FuncionalidadeIndisponivelErro();
  }
}

export class CancelarLembrete {
  constructor(
    readonly lembretes: RepositorioLembretes,
    readonly unidade: UnidadeDeTrabalho,
    readonly eventos: PublicadorEventos,
  ) {}

  async executar(_lembreteId: string, _titularId: string): Promise<void> {
    throw new FuncionalidadeIndisponivelErro();
  }
}

export class RegistrarRespostaDose {
  constructor(
    readonly ocorrencias: RepositorioOcorrencias,
    readonly respostas: RepositorioRespostasDose,
  ) {}

  async executar(
    _ocorrenciaId: string,
    _resposta: 'CONFIRMADA' | 'PULADA',
    _titularId: string,
  ): Promise<void> {
    throw new FuncionalidadeIndisponivelErro();
  }
}

export class ConsultarOcorrencias {
  constructor(readonly ocorrencias: RepositorioOcorrencias) {}

  async executar(_filtros: FiltrosOcorrencias, _titularId: string): Promise<OcorrenciaDeDose[]> {
    throw new FuncionalidadeIndisponivelErro();
  }
}
