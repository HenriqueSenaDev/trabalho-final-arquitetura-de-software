import { useFocusEffect, useRouter } from 'expo-router';
import { ReactNode, useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Botao, Erro } from '@/components/ui';
import { colors } from '@/constants/colors';
import { carregarLinhaDoTempo, ItemDaLinhaDoTempo, PaginaLinhaDoTempo, sair } from '@/lib/api';
import { formatarDataHora } from '@/lib/datas';
import { ApiError } from '@/lib/http-client';
import { sessao } from '@/lib/sessao';

/**
 * Passo 3 do fluxo: a linha do tempo é relida toda vez que a tela ganha
 * foco. Como a API lê os registros vigentes (ADR 02), a consulta recém
 * confirmada já aparece aqui.
 */
export default function LinhaDoTempoScreen() {
  const router = useRouter();
  const [pagina, setPagina] = useState<PaginaLinhaDoTempo | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  const carregar = useCallback(
    async (cursor?: string) => {
      const atual = sessao.atual();
      if (!atual) {
        router.replace('/');
        return;
      }
      setCarregando(true);
      setErro('');
      try {
        const nova = await carregarLinhaDoTempo(atual.token, cursor);
        setPagina((anterior) => (cursor && anterior ? juntarPaginas(anterior, nova) : nova));
      } catch (falha) {
        if (falha instanceof ApiError && falha.status === 401) {
          sessao.encerrar();
          router.replace('/');
          return;
        }
        setErro(falha instanceof ApiError ? falha.message : 'Falha inesperada.');
      } finally {
        setCarregando(false);
      }
    },
    [router],
  );

  useFocusEffect(
    useCallback(() => {
      void carregar();
    }, [carregar]),
  );

  const vazia = pagina && pagina.proximos.length === 0 && pagina.passados.length === 0;

  /** Revoga a sessão no servidor: o token deixa de valer e este aparelho para de receber avisos. */
  async function aoSair() {
    const atual = sessao.atual();
    sessao.encerrar();
    router.replace('/');
    if (atual) {
      await sair(atual).catch(() => undefined);
    }
  }

  const abrir = (item: ItemDaLinhaDoTempo) =>
    router.push({ pathname: '/consulta/[id]', params: { id: item.id } });

  return (
    <ScrollView contentContainerStyle={estilos.tela}>
      <View style={estilos.topo}>
        <Text style={estilos.saudacao}>Olá, {sessao.atual()?.titular.nome}</Text>
        <Pressable accessibilityRole="button" onPress={aoSair} hitSlop={10}>
          <Text style={estilos.sair}>Sair</Text>
        </Pressable>
      </View>
      <Botao titulo="Registrar consulta" onPress={() => router.push('/nova-consulta')} />
      <Erro>{erro}</Erro>
      {!pagina && carregando && <ActivityIndicator color={colors.brand} />}
      {vazia && <Text style={estilos.vazio}>Nenhum registro ainda.</Text>}

      {pagina && pagina.proximos.length > 0 && (
        <Secao titulo="Próximos">
          {pagina.proximos.map((item) => (
            <Item key={`${item.tipo}-${item.id}`} item={item} aoAbrir={abrir} />
          ))}
        </Secao>
      )}

      {pagina?.passados.map((grupo) => (
        <Secao key={grupo.mes} titulo={nomeDoMes(grupo.mes)}>
          {grupo.itens.map((item) => (
            <Item key={`${item.tipo}-${item.id}`} item={item} aoAbrir={abrir} />
          ))}
        </Secao>
      ))}

      {pagina?.cursor && (
        <Botao
          titulo="Carregar mais"
          secundario
          ocupado={carregando}
          onPress={() => carregar(pagina.cursor ?? undefined)}
        />
      )}
    </ScrollView>
  );
}

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <View style={estilos.secao}>
      <Text style={estilos.tituloDaSecao}>{titulo}</Text>
      {children}
    </View>
  );
}

/** Consulta e retorno abrem o mesmo detalhe: o retorno vive na consulta. */
function Item({
  item,
  aoAbrir,
}: {
  item: ItemDaLinhaDoTempo;
  aoAbrir: (item: ItemDaLinhaDoTempo) => void;
}) {
  const retorno = item.tipo === 'RETORNO';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => aoAbrir(item)}
      style={({ pressed }) => [estilos.cartao, pressed && { opacity: 0.7 }]}
    >
      <Text style={[estilos.etiqueta, retorno && { color: colors.success }]}>
        {retorno ? 'Retorno' : 'Consulta'}
      </Text>
      <Text style={estilos.tituloDoItem}>{item.titulo}</Text>
      <Text style={estilos.data}>
        {formatarDataHora(item.data)}
        {item.detalhe ? ` · ${item.detalhe}` : ''}
      </Text>
    </Pressable>
  );
}

/** Páginas seguintes continuam o passado; um mês pode atravessar duas páginas. */
function juntarPaginas(anterior: PaginaLinhaDoTempo, nova: PaginaLinhaDoTempo): PaginaLinhaDoTempo {
  const passados = anterior.passados.map((grupo) => ({ ...grupo, itens: [...grupo.itens] }));
  for (const grupo of nova.passados) {
    const ultimo = passados.at(-1);
    if (ultimo?.mes === grupo.mes) {
      ultimo.itens.push(...grupo.itens);
    } else {
      passados.push(grupo);
    }
  }
  return { proximos: anterior.proximos, passados, cursor: nova.cursor };
}

function nomeDoMes(mes: string): string {
  const [ano, numero] = mes.split('-').map(Number);
  const nome = new Date(ano, numero - 1, 1).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });
  return nome.charAt(0).toUpperCase() + nome.slice(1);
}

const estilos = StyleSheet.create({
  tela: { padding: 20, gap: 16 },
  topo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  saudacao: { fontSize: 18, fontWeight: '600', color: colors.text },
  sair: { fontSize: 15, fontWeight: '600', color: colors.brand },
  vazio: { color: colors.muted, fontSize: 15 },
  secao: { gap: 8 },
  tituloDaSecao: { fontSize: 16, fontWeight: '700', color: colors.brandDeep },
  cartao: { backgroundColor: colors.card, borderRadius: 12, padding: 14, gap: 2 },
  etiqueta: { fontSize: 12, fontWeight: '700', color: colors.brand, textTransform: 'uppercase' },
  tituloDoItem: { fontSize: 16, fontWeight: '600', color: colors.text },
  data: { fontSize: 14, color: colors.muted },
});
