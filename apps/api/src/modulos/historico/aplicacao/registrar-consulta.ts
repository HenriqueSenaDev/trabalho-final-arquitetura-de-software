import { ConflitoErro } from '../../../compartilhado/dominio/erros';
import { Relogio } from '../../../compartilhado/portas/relogio';
import { UnidadeDeTrabalho } from '../../../compartilhado/portas/unidade-de-trabalho';
import { ContratoLembretes } from '../../lembretes/contrato';
import { Consulta, NovaConsulta } from '../dominio/consulta';
import { RepositorioConsultas } from '../portas/repositorio-consultas';

export interface ComandoRegistrarConsulta extends NovaConsulta {
  lembrete?: { antecedenciaMinutos: number };
}

export interface ConsultaRegistrada {
  id: string;
  avisoAgendadoPara: Date | null;
}

/**
 * Caso de uso RegistrarConsulta (porta de entrada do Histórico).
 *
 * Recebe o titular já resolvido pela Entrada HTTP a partir da identidade
 * autenticada, nunca de um campo enviado pelo cliente. Grava a consulta e,
 * se pedido, o agendamento do aviso na mesma unidade de trabalho: ou os
 * dois são confirmados, ou nenhum é.
 *
 * Se o cliente envia o `id`, repetir o pedido (por exemplo, depois de perder
 * a resposta por falta de conexão) devolve a mesma consulta, sem duplicar a
 * consulta nem o aviso.
 */
export class RegistrarConsulta {
  constructor(
    private readonly consultas: RepositorioConsultas,
    private readonly lembretes: ContratoLembretes,
    private readonly unidadeDeTrabalho: UnidadeDeTrabalho,
    private readonly relogio: Relogio,
  ) {}

  async executar(comando: ComandoRegistrarConsulta): Promise<ConsultaRegistrada> {
    if (comando.id) {
      const repetida = await this.consultas.buscar(comando.titularId, comando.id);
      if (repetida) {
        return this.jaRegistrada(repetida);
      }
    }

    const agora = this.relogio.agora();
    const consulta = Consulta.registrar(comando, agora);
    const avisoAgendadoPara = comando.lembrete
      ? consulta.instanteDoAviso(comando.lembrete.antecedenciaMinutos, agora)
      : null;

    const inserida = await this.unidadeDeTrabalho.executar(async () => {
      if (!(await this.consultas.inserir(consulta))) {
        return false;
      }
      if (avisoAgendadoPara) {
        await this.lembretes.agendarAvisoDeConsulta({
          titularId: consulta.titularId,
          consultaId: consulta.id,
          instante: avisoAgendadoPara,
        });
      }
      return true;
    });

    if (!inserida) {
      // Dois envios do mesmo pedido ao mesmo tempo: o primeiro gravou.
      const existente = await this.consultas.buscar(comando.titularId, consulta.id);
      if (!existente) {
        throw new ConflitoErro('Este identificador já está em uso.');
      }
      return this.jaRegistrada(existente);
    }
    return { id: consulta.id, avisoAgendadoPara };
  }

  private async jaRegistrada(consulta: Consulta): Promise<ConsultaRegistrada> {
    const aviso = await this.lembretes.avisoDaConsulta({
      titularId: consulta.titularId,
      consultaId: consulta.id,
    });
    return {
      id: consulta.id,
      avisoAgendadoPara: aviso?.estado === 'PENDENTE' ? aviso.instante : null,
    };
  }
}
