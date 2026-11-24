import { FuncionalidadeIndisponivelErro } from '../../../../compartilhado/dominio/erros';
import { Lembrete } from '../../dominio/lembrete';
import { OcorrenciaDeDose } from '../../dominio/ocorrencia-de-dose';
import { RespostaDose } from '../../dominio/resposta-dose';
import { RepositorioLembretes } from '../../portas/repositorio-lembretes';
import { RepositorioOcorrencias } from '../../portas/repositorio-ocorrencias';
import { RepositorioRespostasDose } from '../../portas/repositorio-respostas-dose';

export class PrismaRepositorioLembretes extends RepositorioLembretes {
  async salvar(_lembrete: Lembrete): Promise<void> {
    throw new FuncionalidadeIndisponivelErro();
  }

  async buscarPorId(_id: string, _titularId: string): Promise<Lembrete | null> {
    throw new FuncionalidadeIndisponivelErro();
  }

  async buscarPorOrigem(_origemId: string, _titularId: string): Promise<Lembrete | null> {
    throw new FuncionalidadeIndisponivelErro();
  }
}

export class PrismaRepositorioOcorrencias extends RepositorioOcorrencias {
  async salvar(_ocorrencia: OcorrenciaDeDose): Promise<void> {
    throw new FuncionalidadeIndisponivelErro();
  }

  async buscarPorId(_id: string, _titularId: string): Promise<OcorrenciaDeDose | null> {
    throw new FuncionalidadeIndisponivelErro();
  }

  async listarPorTratamento(_tratamentoId: string): Promise<OcorrenciaDeDose[]> {
    throw new FuncionalidadeIndisponivelErro();
  }

  async cancelarOcorrenciasFuturas(_tratamentoId: string): Promise<void> {
    throw new FuncionalidadeIndisponivelErro();
  }
}

export class PrismaRepositorioRespostasDose extends RepositorioRespostasDose {
  async salvar(_resposta: RespostaDose): Promise<void> {
    throw new FuncionalidadeIndisponivelErro();
  }

  async buscarPorOcorrencia(_ocorrenciaId: string): Promise<RespostaDose | null> {
    throw new FuncionalidadeIndisponivelErro();
  }
}
