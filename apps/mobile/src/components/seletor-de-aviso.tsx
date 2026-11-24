import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/colors';

export const OPCOES_DE_AVISO = [
  { rotulo: 'Sem aviso', minutos: null },
  { rotulo: '1 hora antes', minutos: 60 },
  { rotulo: '1 dia antes', minutos: 24 * 60 },
] as const;

/** Uma antecedência só vale se o aviso ainda cair no futuro (a API recusa o resto). */
export function avisoValido(dataHora: string | null, minutos: number | null): boolean {
  if (minutos === null) return true;
  if (!dataHora) return false;
  return new Date(dataHora).getTime() - minutos * 60_000 > Date.now();
}

/** O que de fato vai para a API: uma escolha que deixou de valer vira "Sem aviso". */
export function avisoEfetivo(dataHora: string | null, minutos: number | null): number | null {
  return avisoValido(dataHora, minutos) ? minutos : null;
}

/**
 * Escolha do aviso. Consulta passada fica sem aviso, e opções que cairiam no
 * passado aparecem desabilitadas, em vez de o titular só descobrir pelo erro.
 */
export function SeletorDeAviso({
  dataHora,
  valor,
  aoMudar,
}: {
  dataHora: string | null;
  valor: number | null;
  aoMudar: (minutos: number | null) => void;
}) {
  const efetivo = avisoEfetivo(dataHora, valor);
  const passada = dataHora !== null && new Date(dataHora).getTime() <= Date.now();

  return (
    <View style={estilos.grupo}>
      <Text style={estilos.rotulo}>Aviso</Text>
      <View style={estilos.linha}>
        {OPCOES_DE_AVISO.map((opcao) => {
          const disponivel = avisoValido(dataHora, opcao.minutos);
          const escolhida = efetivo === opcao.minutos;
          return (
            <Pressable
              key={opcao.rotulo}
              disabled={!disponivel}
              accessibilityState={{ disabled: !disponivel, selected: escolhida }}
              onPress={() => aoMudar(opcao.minutos)}
              style={[
                estilos.opcao,
                escolhida && estilos.opcaoEscolhida,
                !disponivel && estilos.opcaoIndisponivel,
              ]}
            >
              <Text style={[estilos.textoDaOpcao, escolhida && { color: '#FFFFFF' }]}>
                {opcao.rotulo}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {passada && <Text style={estilos.dica}>Consulta passada: fica registrada sem aviso.</Text>}
    </View>
  );
}

const estilos = StyleSheet.create({
  grupo: { gap: 6 },
  rotulo: { fontSize: 14, fontWeight: '600', color: colors.text },
  linha: { flexDirection: 'row', gap: 10 },
  opcao: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.brand,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  opcaoEscolhida: { backgroundColor: colors.brand },
  opcaoIndisponivel: { opacity: 0.35 },
  textoDaOpcao: { color: colors.brand, fontWeight: '600', fontSize: 13 },
  dica: { fontSize: 13, color: colors.muted },
});
