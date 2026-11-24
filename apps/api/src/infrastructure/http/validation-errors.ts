import { BadRequestException, ValidationError } from '@nestjs/common';

/** Mensagens de formato em português: o aplicativo mostra a mensagem da API ao titular. */
const MESSAGES: Record<string, string> = {
  isNotEmpty: 'não pode ficar vazio',
  isString: 'precisa ser um texto',
  isDate: 'precisa ser uma data e hora válida',
  isInt: 'precisa ser um número inteiro',
  isNumber: 'precisa ser um número',
  min: 'está abaixo do mínimo permitido',
  max: 'está acima do máximo permitido',
  minLength: 'é mais curto que o exigido',
  maxLength: 'é mais longo que o permitido',
  isEmail: 'precisa ser um e-mail válido',
  isUuid: 'precisa ser um identificador válido',
  isIn: 'tem um valor que não é aceito',
  isArray: 'precisa ser uma lista',
  nestedValidation: 'tem um formato inválido',
  whitelistValidation: 'não é aceito nesta requisição',
};

/** `exceptionFactory` do ValidationPipe: 400 com uma mensagem por campo. */
export function validationErrors(errors: ValidationError[]): BadRequestException {
  return new BadRequestException(messages(errors));
}

function messages(errors: ValidationError[], prefix = ''): string[] {
  return errors.flatMap((error) => {
    const field = `${prefix}${error.property}`;
    const own = Object.keys(error.constraints ?? {}).map(
      (rule) => `${field}: ${MESSAGES[rule] ?? 'valor inválido'}.`,
    );
    return [...own, ...messages(error.children ?? [], `${field}.`)];
  });
}
