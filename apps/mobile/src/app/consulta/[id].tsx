import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { avisoEfetivo, SeletorDeAviso } from '@/components/seletor-de-aviso';
import { Botao, Campo, Erro } from '@/components/ui';
import { colors } from '@/constants/colors';
import {
  AlteracaoDeConsulta,
  AvisoDaConsulta,
  alterarConsulta,
  DetalheDaConsulta,
  detalharConsulta,
  excluirConsulta,
} from '@/lib/api';
import { formatarDataHora, instante, mascararData, mascararHora, paraCampos } from '@/lib/datas';
import { ApiError } from '@/lib/http-client';
import { sessao } from '@/lib/sessao';

type Acao = 'salvar' | 'cancelar-aviso' | 'excluir';

/**
 * Detalhe de um item da linha do tempo (RF2). Daqui o titular remarca a
 * consulta, reagenda ou cancela o aviso (nova versão do agendamento, ADR 03)
 * e exclui a consulta (RF1.1).
 */
export default function ConsultaScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [detalhe, setDetalhe] = useState<DetalheDaConsulta | null>(null);
  const [indisponivel, setIndisponivel] = useState(false);
  const [data, setData] = useState('');
  const [hora, setHora] = useState('');
  const [aviso, setAviso] = useState<number | null>(null);
  const [ocupado, setOcupado] = useState<Acao | null>(null);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');

  const mostrar = useCallback((novo: DetalheDaConsulta) => {
    setDetalhe(novo);
    const campos = paraCampos(novo.dataHora);
    setData(campos.data);
    setHora(campos.hora);
    setAviso(novo.aviso?.estado === 'PENDENTE' ? antecedencia(novo.dataHora, novo.aviso) : null);
  }, []);

  const tratarFalha = useCallback(
    (falha: unknown) => {
      if (falha instanceof ApiError && falha.status === 401) {
        sessao.encerrar();
        router.replace('/');
      } else if (falha instanceof ApiError && falha.status === 404) {
        setIndisponivel(true);
      } else {
        setErro(falha instanceof ApiError ? falha.message : 'Falha inesperada.');
      }
    },
    [router],
  );

  const carregar = useCallback(async () => {
    const atual = sessao.atual();
    if (!atual) {
      router.replace('/');
      return;
    }
    try {
      mostrar(await detalharConsulta(atual.token, id));
    } catch (falha) {
      tratarFalha(falha);
    }
  }, [id, mostrar, router, tratarFalha]);

  useFocusEffect(
    useCallback(() => {
      void carregar();
    }, [carregar]),
  );

  async function executar(acao: Acao, operacao: (token: string) => Promise<string | void>) {
    const atual = sessao.atual();
    if (!atual) {
      router.replace('/');
      return;
    }
    setOcupado(acao);
    setErro('');
    setMensagem('');
    try {
      const resultado = await operacao(atual.token);
      if (acao === 'excluir') {
        router.back();
        return;
      }
      mostrar(await detalharConsulta(atual.token, id));
      if (resultado) setMensagem(resultado);
    } catch (falha) {
      tratarFalha(falha);
    } finally {
      setOcupado(null);
    }
  }

  function aoSalvar() {
    const dataHora = instante(data, hora);
    if (!dataHora) {
      setErro('Confira a data (DD/MM/AAAA) e a hora (HH:MM).');
      return;
    }
    const minutos = avisoEfetivo(dataHora, aviso);
    const alteracao: AlteracaoDeConsulta = {
      dataHora,
      lembrete: minutos === null ? null : { antecedenciaMinutos: minutos },
    };
    void executar('salvar', async (token) => {
      const { avisoAgendadoPara } = await alterarConsulta(token, id, alteracao);
      return avisoAgendadoPara
        ? `Salvo. Aviso agendado para ${formatarDataHora(avisoAgendadoPara)}.`
        : 'Salvo. A consulta está sem aviso.';
    });
  }

  if (indisponivel) {
    return (
      <View style={estilos.tela}>
        <Text style={estilos.vazio}>Esta consulta não está disponível.</Text>
        <Botao titulo="Voltar" secundario onPress={() => router.back()} />
      </View>
    );
  }
  if (!detalhe) {
    return (
      <View style={estilos.tela}>
        <ActivityIndicator color={colors.brand} />
        <Erro>{erro}</Erro>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={estilos.tela} keyboardShouldPersistTaps="handled">
      <View style={estilos.cartao}>
        <Text style={estilos.titulo}>{detalhe.especialidade}</Text>
        <Text style={estilos.linhaDeTexto}>{formatarDataHora(detalhe.dataHora)}</Text>
        {detalhe.profissional && <Text style={estilos.linhaDeTexto}>{detalhe.profissional}</Text>}
        {detalhe.local && <Text style={estilos.linhaDeTexto}>{detalhe.local}</Text>}
        {detalhe.retornoEm && (
          <Text style={estilos.linhaDeTexto}>Retorno: {formatarDataHora(detalhe.retornoEm)}</Text>
        )}
        <Text style={[estilos.linhaDeTexto, estilos.aviso]}>{descreverAviso(detalhe.aviso)}</Text>
        <Text style={estilos.registro}>Registrada em {formatarDataHora(detalhe.registradaEm)}</Text>
      </View>

      <Text style={estilos.secao}>Remarcar ou mudar o aviso</Text>
      <View style={estilos.linha}>
        <View style={{ flex: 3 }}>
          <Campo
            rotulo="Data"
            keyboardType="number-pad"
            maxLength={10}
            value={data}
            onChangeText={(texto) => setData(mascararData(texto))}
          />
        </View>
        <View style={{ flex: 2 }}>
          <Campo
            rotulo="Hora"
            keyboardType="number-pad"
            maxLength={5}
            value={hora}
            onChangeText={(texto) => setHora(mascararHora(texto))}
          />
        </View>
      </View>
      <SeletorDeAviso dataHora={instante(data, hora)} valor={aviso} aoMudar={setAviso} />

      <Erro>{erro}</Erro>
      {mensagem ? <Text style={estilos.sucesso}>{mensagem}</Text> : null}
      <Botao titulo="Salvar alterações" onPress={aoSalvar} ocupado={ocupado === 'salvar'} />

      {detalhe.aviso?.estado === 'PENDENTE' && (
        <Botao
          titulo="Cancelar aviso"
          secundario
          ocupado={ocupado === 'cancelar-aviso'}
          onPress={() =>
            void executar('cancelar-aviso', async (token) => {
              await alterarConsulta(token, id, { lembrete: null });
              return 'Aviso cancelado.';
            })
          }
        />
      )}

      {confirmandoExclusao ? (
        <View style={estilos.confirmacao}>
          <Text style={estilos.linhaDeTexto}>
            Excluir a consulta, o retorno e o aviso pendente? Não dá para desfazer.
          </Text>
          <Botao
            titulo="Sim, excluir"
            destrutivo
            ocupado={ocupado === 'excluir'}
            onPress={() => void executar('excluir', (token) => excluirConsulta(token, id))}
          />
          <Botao titulo="Manter" secundario onPress={() => setConfirmandoExclusao(false)} />
        </View>
      ) : (
        <Botao titulo="Excluir consulta" destrutivo onPress={() => setConfirmandoExclusao(true)} />
      )}
    </ScrollView>
  );
}

function antecedencia(dataHora: string, aviso: AvisoDaConsulta): number {
  return Math.round((new Date(dataHora).getTime() - new Date(aviso.instante).getTime()) / 60_000);
}

function descreverAviso(aviso: AvisoDaConsulta | null): string {
  if (!aviso) return 'Sem aviso';
  const versao = `versão ${aviso.versao}`;
  switch (aviso.estado) {
    case 'PENDENTE':
      return `Aviso em ${formatarDataHora(aviso.instante)} · ${versao}`;
    case 'ENVIADO':
      return `Aviso enviado · ${versao}`;
    case 'CANCELADO':
      return `Aviso cancelado · ${versao}`;
    case 'FALHOU':
      return `Aviso não entregue · ${versao}`;
  }
}

const estilos = StyleSheet.create({
  tela: { padding: 20, gap: 14 },
  cartao: { backgroundColor: colors.card, borderRadius: 12, padding: 16, gap: 4 },
  titulo: { fontSize: 20, fontWeight: '700', color: colors.text },
  linhaDeTexto: { fontSize: 15, color: colors.text },
  aviso: { marginTop: 6, fontWeight: '600', color: colors.brandDeep },
  registro: { fontSize: 13, color: colors.muted, marginTop: 6 },
  secao: { fontSize: 16, fontWeight: '700', color: colors.brandDeep, marginTop: 8 },
  linha: { flexDirection: 'row', gap: 10 },
  sucesso: { color: colors.success, fontSize: 14 },
  confirmacao: { gap: 10, padding: 12, borderRadius: 12, backgroundColor: colors.card },
  vazio: { color: colors.muted, fontSize: 15 },
});
