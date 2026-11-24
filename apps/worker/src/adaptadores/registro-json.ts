import { Registro } from '../portas/registro';

/** Registro em linhas JSON no stdout/stderr. */
export const registroJson: Registro = {
  info: (mensagem, detalhes) =>
    console.log(JSON.stringify({ nivel: 'info', mensagem, ...detalhes, em: new Date() })),
  aviso: (mensagem, detalhes) =>
    console.warn(JSON.stringify({ nivel: 'aviso', mensagem, ...detalhes, em: new Date() })),
  erro: (mensagem, detalhes) =>
    console.error(JSON.stringify({ nivel: 'erro', mensagem, ...detalhes, em: new Date() })),
};
