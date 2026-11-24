/** Porta de saída para o instante atual; nos testes, um relógio fixo. */
export abstract class Relogio {
  abstract agora(): Date;
}
