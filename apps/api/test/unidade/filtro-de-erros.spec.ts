import { ArgumentsHost, HttpStatus } from '@nestjs/common';
import {
  ConflitoErro,
  CredenciaisInvalidasErro,
  FuncionalidadeIndisponivelErro,
  RecursoIndisponivelErro,
  RegraVioladaErro,
} from '../../src/compartilhado/dominio/erros';
import { FiltroDeErrosDeDominio } from '../../src/entrada-http/filtro-de-erros';

describe('FiltroDeErrosDeDominio', () => {
  it.each([
    [new FuncionalidadeIndisponivelErro(), HttpStatus.SERVICE_UNAVAILABLE],
    [new RecursoIndisponivelErro(), HttpStatus.NOT_FOUND],
    [new CredenciaisInvalidasErro(), HttpStatus.UNAUTHORIZED],
    [new ConflitoErro('Conflito.'), HttpStatus.CONFLICT],
    [new RegraVioladaErro('Regra violada.'), HttpStatus.UNPROCESSABLE_ENTITY],
  ])('mapeia %s para HTTP %s', (erro, statusEsperado) => {
    let statusRecebido: number | undefined;
    let corpoRecebido: unknown;
    const resposta = {
      status(status: number) {
        statusRecebido = status;
        return this;
      },
      json(corpo: unknown) {
        corpoRecebido = corpo;
        return this;
      },
    };
    const host = {
      switchToHttp: () => ({ getResponse: () => resposta }),
    } as unknown as ArgumentsHost;

    new FiltroDeErrosDeDominio().catch(erro, host);

    expect(statusRecebido).toBe(statusEsperado);
    expect(corpoRecebido).toMatchObject({ statusCode: statusEsperado });
  });
});
