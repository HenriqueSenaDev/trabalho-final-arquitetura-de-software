import { randomUUID } from 'node:crypto';
import { RegraVioladaErro } from '../../../compartilhado/dominio/erros';
import { Anexo } from './anexo';

export interface DadosExame {
  id: string;
  titularId: string;
  tipo: string;
  dataRealizacao: Date;
  laboratorio: string | null;
  observacoes: string | null;
  registradoEm: Date;
  anexos: Anexo[];
}

export interface NovoExame {
  id?: string;
  titularId: string;
  tipo: string;
  dataRealizacao: Date;
  laboratorio?: string | null;
  observacoes?: string | null;
}

export type AlteracaoExame = Partial<
  Pick<DadosExame, 'tipo' | 'dataRealizacao' | 'laboratorio' | 'observacoes'>
>;

export class Exame {
  private constructor(private readonly dados: DadosExame) {}

  static registrar(novo: NovoExame, agora: Date): Exame {
    return new Exame(
      Exame.validar({
        id: novo.id ?? randomUUID(),
        titularId: novo.titularId,
        tipo: novo.tipo,
        dataRealizacao: novo.dataRealizacao,
        laboratorio: novo.laboratorio ?? null,
        observacoes: novo.observacoes ?? null,
        registradoEm: agora,
        anexos: [],
      }),
    );
  }

  static restaurar(dados: DadosExame): Exame {
    return new Exame({ ...dados, anexos: [...dados.anexos] });
  }

  alterar(alteracao: AlteracaoExame): Exame {
    return new Exame(Exame.validar({ ...this.dados, ...alteracao }));
  }

  adicionarAnexo(anexo: Anexo): Exame {
    if (anexo.exameId !== this.dados.id) {
      throw new RegraVioladaErro('O anexo não pertence a este exame.');
    }
    if (this.dados.anexos.length >= 5) {
      throw new RegraVioladaErro('Um exame pode ter no máximo cinco anexos.');
    }
    return new Exame({ ...this.dados, anexos: [...this.dados.anexos, anexo] });
  }

  removerAnexo(anexoId: string): Exame {
    return new Exame({
      ...this.dados,
      anexos: this.dados.anexos.filter((anexo) => anexo.id !== anexoId),
    });
  }

  get id(): string {
    return this.dados.id;
  }

  get titularId(): string {
    return this.dados.titularId;
  }

  paraLeitura(): DadosExame {
    return { ...this.dados, anexos: [...this.dados.anexos] };
  }

  private static validar(dados: DadosExame): DadosExame {
    if (!dados.tipo.trim()) throw new RegraVioladaErro('Informe o tipo do exame.');
    if (Number.isNaN(dados.dataRealizacao.getTime())) {
      throw new RegraVioladaErro('Informe uma data de realização válida.');
    }
    return { ...dados, tipo: dados.tipo.trim() };
  }
}
