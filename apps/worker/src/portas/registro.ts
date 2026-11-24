/** Porta de saída para os registros operacionais do processador. */
export interface Registro {
  info(mensagem: string, detalhes?: object): void;
  aviso(mensagem: string, detalhes?: object): void;
  erro(mensagem: string, detalhes?: object): void;
}
