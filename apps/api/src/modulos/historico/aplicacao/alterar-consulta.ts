import { RecursoIndisponivelErro } from '../../../compartilhado/dominio/erros';
import { Relogio } from '../../../compartilhado/portas/relogio';
import { UnidadeDeTrabalho } from '../../../compartilhado/portas/unidade-de-trabalho';
import { ContratoLembretes } from '../../lembretes/contrato';
import { CorrecaoDeConsulta } from '../dominio/consulta';
import { RepositorioConsultas } from '../portas/repositorio-consultas';

export interface ComandoAlterarConsulta extends CorrecaoDeConsulta {
  titularId: string;
  id: string;
  /**
   * Ausente: mantém o aviso (numa remarcação, com a mesma antecedência).
   * `null`: cancela o aviso. Objeto: reagenda com essa antecedência.
   */
  lembrete?: { antecedenciaMinutos: number } | null;
}

export interface ConsultaAlterada {
  id: string;
  avisoAgendadoPara: Date | null;
}

/**
 * Caso de uso AlterarConsulta: corrige ou remarca a consulta e revisa o aviso
 * na mesma transação (C3). Reagendar ou cancelar gera uma nova versão do
 * agendamento, e o processador deixa de entregar a anterior (ADR 03).
 */
export class AlterarConsulta {
  constructor(
    private readonly consultas: RepositorioConsultas,
    private readonly lembretes: ContratoLembretes,
    private readonly unidadeDeTrabalho: UnidadeDeTrabalho,
    private readonly relogio: Relogio,
  ) {}

  executar(comando: ComandoAlterarConsulta): Promise<ConsultaAlterada> {
    const agora = this.relogio.agora();
    const referencia = { titularId: comando.titularId, consultaId: comando.id };

    return this.unidadeDeTrabalho.executar(async () => {
      const atual = await this.consultas.buscar(comando.titularId, comando.id);
      if (!atual) {
        throw new RecursoIndisponivelErro();
      }
      const corrigida = atual.corrigir(comando);
      const aviso = await this.lembretes.avisoDaConsulta(referencia);
      const pendente = aviso?.estado === 'PENDENTE' ? aviso : null;

      // undefined: o aviso não muda; null: cancelar; Date: reagendar.
      let novoAviso: Date | null | undefined;
      if (comando.lembrete === null) {
        novoAviso = null;
      } else if (comando.lembrete) {
        novoAviso = corrigida.instanteDoAviso(comando.lembrete.antecedenciaMinutos, agora);
      } else if (pendente && corrigida.dataHora.getTime() !== atual.dataHora.getTime()) {
        novoAviso = corrigida.avisoRemarcado(atual.antecedenciaDe(pendente.instante), agora);
      }

      await this.consultas.salvar(corrigida);

      if (novoAviso === null) {
        await this.lembretes.cancelarAvisoDeConsulta(referencia);
        return { id: comando.id, avisoAgendadoPara: null };
      }
      if (novoAviso) {
        const reagendado = await this.lembretes.agendarAvisoDeConsulta({
          ...referencia,
          instante: novoAviso,
        });
        return { id: comando.id, avisoAgendadoPara: reagendado.instante };
      }
      return { id: comando.id, avisoAgendadoPara: pendente?.instante ?? null };
    });
  }
}
