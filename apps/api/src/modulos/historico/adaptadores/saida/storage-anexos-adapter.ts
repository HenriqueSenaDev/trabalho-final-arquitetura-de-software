import { Injectable } from '@nestjs/common';
import { FuncionalidadeIndisponivelErro } from '../../../../compartilhado/dominio/erros';
import {
  ArmazenamentoAnexos,
  ArquivoAnexo,
  ReferenciaArquivo,
} from '../../portas/armazenamento-anexos';

@Injectable()
export class StorageAnexosAdapter extends ArmazenamentoAnexos {
  async armazenar(_arquivo: ArquivoAnexo): Promise<ReferenciaArquivo> {
    throw new FuncionalidadeIndisponivelErro();
  }

  async recuperar(_chave: string): Promise<Uint8Array> {
    throw new FuncionalidadeIndisponivelErro();
  }

  async excluir(_chave: string): Promise<void> {
    throw new FuncionalidadeIndisponivelErro();
  }
}
