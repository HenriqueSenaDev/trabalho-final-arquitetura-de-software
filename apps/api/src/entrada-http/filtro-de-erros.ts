import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import {
  ConflitoErro,
  CredenciaisInvalidasErro,
  ErroDeDominio,
  FuncionalidadeIndisponivelErro,
  RecursoIndisponivelErro,
} from '../compartilhado/dominio/erros';

/** Traduz os erros do núcleo para HTTP na borda da aplicação. */
@Catch(ErroDeDominio)
export class FiltroDeErrosDeDominio implements ExceptionFilter {
  catch(erro: ErroDeDominio, host: ArgumentsHost): void {
    const status = statusDe(erro);
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(status)
      .json({ statusCode: status, message: erro.message });
  }
}

function statusDe(erro: ErroDeDominio): HttpStatus {
  if (erro instanceof FuncionalidadeIndisponivelErro) return HttpStatus.SERVICE_UNAVAILABLE;
  if (erro instanceof RecursoIndisponivelErro) return HttpStatus.NOT_FOUND;
  if (erro instanceof CredenciaisInvalidasErro) return HttpStatus.UNAUTHORIZED;
  if (erro instanceof ConflitoErro) return HttpStatus.CONFLICT;
  if (erro instanceof FuncionalidadeIndisponivelErro) return HttpStatus.SERVICE_UNAVAILABLE;
  return HttpStatus.UNPROCESSABLE_ENTITY;
}
