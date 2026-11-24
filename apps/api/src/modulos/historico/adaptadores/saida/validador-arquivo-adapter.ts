import { Injectable } from '@nestjs/common';
import { FuncionalidadeIndisponivelErro } from '../../../../compartilhado/dominio/erros';
import { ArquivoAnexo } from '../../portas/armazenamento-anexos';
import { ValidadorArquivo } from '../../portas/validador-arquivo';

@Injectable()
export class ValidadorArquivoAdapter extends ValidadorArquivo {
  async validar(_arquivo: ArquivoAnexo): Promise<void> {
    throw new FuncionalidadeIndisponivelErro();
  }
}
