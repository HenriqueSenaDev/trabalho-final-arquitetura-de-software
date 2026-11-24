import { BadRequestException, ValidationError } from '@nestjs/common';

/**
 * Mensagens de formato em português. O class-validator responde em inglês, e o
 * aplicativo mostra a mensagem da API ao titular.
 */
const MENSAGENS: Record<string, string> = {
  isNotEmpty: 'não pode ficar vazio',
  isString: 'precisa ser um texto',
  isDate: 'precisa ser uma data e hora válida',
  isInt: 'precisa ser um número inteiro',
  min: 'está abaixo do mínimo permitido',
  max: 'está acima do máximo permitido',
  minLength: 'é mais curto que o exigido',
  maxLength: 'é mais longo que o permitido',
  isEmail: 'precisa ser um e-mail válido',
  isUuid: 'precisa ser um identificador válido',
  isArray: 'precisa ser uma lista',
  isIn: 'tem um valor que não é aceito',
  nestedValidation: 'tem um formato inválido',
  whitelistValidation: 'não é aceito nesta requisição',
};

/** Usada como `exceptionFactory` do ValidationPipe: 400 com uma mensagem por campo. */
export function errosDeValidacao(erros: ValidationError[]): BadRequestException {
  return new BadRequestException(mensagens(erros));
}

function mensagens(erros: ValidationError[], prefixo = ''): string[] {
  return erros.flatMap((erro) => {
    const campo = `${prefixo}${erro.property}`;
    const proprias = Object.keys(erro.constraints ?? {}).map(
      (regra) => `${campo}: ${MENSAGENS[regra] ?? 'valor inválido'}.`,
    );
    return [...proprias, ...mensagens(erro.children ?? [], `${campo}.`)];
  });
}
