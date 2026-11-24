function numero(nome: string, padrao: number): number {
  const bruto = process.env[nome];
  const valor = bruto ? Number(bruto) : padrao;
  if (!Number.isInteger(valor) || valor <= 0) {
    throw new Error(`Variável ${nome} inválida: ${bruto}`);
  }
  return valor;
}

export function lerConfiguracao() {
  const configuracao = {
    intervaloMs: numero('LEMBRETES_INTERVALO_MS', 2000),
    lote: numero('LEMBRETES_LOTE', 20),
    reservaSegundos: numero('LEMBRETES_RESERVA_SEGUNDOS', 60),
    maxTentativas: numero('LEMBRETES_MAX_TENTATIVAS', 5),
    esperaBaseSegundos: numero('LEMBRETES_ESPERA_BASE_SEGUNDOS', 30),
    provedor: process.env.PROVEDOR_NOTIFICACOES ?? 'console',
    provedorUrl: process.env.PROVEDOR_NOTIFICACOES_URL ?? '',
    provedorToken: process.env.PROVEDOR_NOTIFICACOES_TOKEN ?? '',
    provedorTempoLimiteSegundos: numero('PROVEDOR_NOTIFICACOES_TEMPO_LIMITE_SEGUNDOS', 10),
  };

  // A reserva é renovada logo antes de cada envio; ela precisa durar mais que
  // o envio mais lento, senão outra réplica pode assumir no meio dele.
  if (configuracao.reservaSegundos < 2 * configuracao.provedorTempoLimiteSegundos) {
    throw new Error(
      'LEMBRETES_RESERVA_SEGUNDOS precisa ser pelo menos o dobro de ' +
        'PROVEDOR_NOTIFICACOES_TEMPO_LIMITE_SEGUNDOS.',
    );
  }
  return configuracao;
}

export type Configuracao = ReturnType<typeof lerConfiguracao>;
