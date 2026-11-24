/**
 * Adaptadores em memória para os testes de unidade: as portas permitem
 * exercitar os casos de uso reais sem banco.
 */
import { ConflitoErro } from '../../src/compartilhado/dominio/erros';
import { Relogio } from '../../src/compartilhado/portas/relogio';
import { UnidadeDeTrabalho } from '../../src/compartilhado/portas/unidade-de-trabalho';
import { Consulta } from '../../src/modulos/historico/dominio/consulta';
import { RepositorioConsultas } from '../../src/modulos/historico/portas/repositorio-consultas';
import { Agendamento, DadosAgendamento } from '../../src/modulos/lembretes/dominio/agendamento';
import { RepositorioAgendamentos } from '../../src/modulos/lembretes/portas/repositorio-agendamentos';

interface Participante {
  fotografar(): () => void;
}

/** Unidade de trabalho em memória: desfaz o que foi gravado se o trabalho falhar. */
export class UnidadeEmMemoria extends UnidadeDeTrabalho {
  constructor(private readonly participantes: Participante[]) {
    super();
  }

  async executar<T>(trabalho: () => Promise<T>): Promise<T> {
    const restauracoes = this.participantes.map((participante) => participante.fotografar());
    try {
      return await trabalho();
    } catch (erro) {
      restauracoes.forEach((restaurar) => restaurar());
      throw erro;
    }
  }
}

export class ConsultasEmMemoria extends RepositorioConsultas {
  itens = new Map<string, Consulta>();

  fotografar() {
    const copia = new Map(this.itens);
    return () => {
      this.itens = copia;
    };
  }

  async inserir(consulta: Consulta): Promise<boolean> {
    if (this.itens.has(consulta.id)) return false;
    this.itens.set(consulta.id, consulta);
    return true;
  }

  async salvar(consulta: Consulta): Promise<void> {
    this.itens.set(consulta.id, consulta);
  }

  async buscar(titularId: string, id: string): Promise<Consulta | null> {
    const consulta = this.itens.get(id);
    return consulta?.titularId === titularId ? consulta : null;
  }

  async excluir(titularId: string, id: string): Promise<boolean> {
    if (!(await this.buscar(titularId, id))) return false;
    this.itens.delete(id);
    return true;
  }
}

/** Guarda um agendamento por consulta, com a mesma checagem de versão do adaptador Prisma. */
export class AgendamentosEmMemoria extends RepositorioAgendamentos {
  itens = new Map<string, DadosAgendamento>();
  falha: Error | null = null;

  fotografar() {
    const copia = new Map([...this.itens].map(([chave, dados]) => [chave, { ...dados }]));
    return () => {
      this.itens = copia;
    };
  }

  async buscarPorOrigem(
    titularId: string,
    origem: { tipo: 'CONSULTA'; id: string },
  ): Promise<Agendamento | null> {
    const dados = this.itens.get(origem.id);
    return dados && dados.titularId === titularId ? Agendamento.restaurar(dados) : null;
  }

  async salvar(agendamento: Agendamento): Promise<void> {
    if (this.falha) throw this.falha;
    const dados = agendamento.paraGravacao();
    const atual = this.itens.get(dados.origem.id);
    if ((atual?.versao ?? null) !== agendamento.versaoLida) {
      throw new ConflitoErro('O aviso foi alterado por outra operação.');
    }
    this.itens.set(dados.origem.id, dados);
  }

  daConsulta(consultaId: string): DadosAgendamento | undefined {
    return this.itens.get(consultaId);
  }
}

export const relogioFixo = (agora: Date): Relogio => ({ agora: () => agora });
