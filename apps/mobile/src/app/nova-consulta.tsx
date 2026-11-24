import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { avisoEfetivo, SeletorDeAviso } from '@/components/seletor-de-aviso';
import { Botao, Campo, Erro } from '@/components/ui';
import { registrarConsulta } from '@/lib/api';
import { instante, mascararData, mascararHora, novoIdentificador } from '@/lib/datas';
import { ApiError } from '@/lib/http-client';
import { sessao } from '@/lib/sessao';

/**
 * Passo 2 do fluxo: o titular envia a consulta. As regras (retorno
 * posterior, aviso no futuro) são da API; a tela só evita oferecer um aviso
 * que a API recusaria e mostra o que ela responder.
 */
export default function NovaConsultaScreen() {
  const router = useRouter();
  // Um id por formulário: tocar em "Salvar" de novo depois de uma falha de
  // conexão não duplica a consulta nem o aviso.
  const [id] = useState(novoIdentificador);
  const [especialidade, setEspecialidade] = useState('');
  const [data, setData] = useState('');
  const [hora, setHora] = useState('');
  const [profissional, setProfissional] = useState('');
  const [local, setLocal] = useState('');
  const [retornoData, setRetornoData] = useState('');
  const [retornoHora, setRetornoHora] = useState('');
  const [aviso, setAviso] = useState<number | null>(60);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');

  const dataHora = instante(data, hora);

  async function aoSalvar() {
    const atual = sessao.atual();
    if (!atual) {
      router.replace('/');
      return;
    }
    // Sem hora própria, o retorno usa a hora da consulta.
    const retornoEm = retornoData ? instante(retornoData, retornoHora || hora) : undefined;
    if (!dataHora || retornoEm === null) {
      setErro('Confira as datas (DD/MM/AAAA) e as horas (HH:MM).');
      return;
    }

    const minutos = avisoEfetivo(dataHora, aviso);
    setOcupado(true);
    setErro('');
    try {
      await registrarConsulta(atual.token, {
        id,
        dataHora,
        especialidade,
        profissional: profissional || undefined,
        local: local || undefined,
        retornoEm,
        lembrete: minutos === null ? undefined : { antecedenciaMinutos: minutos },
      });
      // Só volta depois da confirmação do servidor.
      router.back();
    } catch (falha) {
      if (falha instanceof ApiError && falha.status === 401) {
        sessao.encerrar();
        router.replace('/');
        return;
      }
      setErro(falha instanceof ApiError ? falha.message : 'Falha inesperada.');
    } finally {
      setOcupado(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={estilos.tela} keyboardShouldPersistTaps="handled">
      <Campo rotulo="Especialidade" value={especialidade} onChangeText={setEspecialidade} />
      <View style={estilos.linha}>
        <View style={{ flex: 3 }}>
          <Campo
            rotulo="Data"
            placeholder="05/12/2026"
            keyboardType="number-pad"
            maxLength={10}
            value={data}
            onChangeText={(texto) => setData(mascararData(texto))}
          />
        </View>
        <View style={{ flex: 2 }}>
          <Campo
            rotulo="Hora"
            placeholder="14:30"
            keyboardType="number-pad"
            maxLength={5}
            value={hora}
            onChangeText={(texto) => setHora(mascararHora(texto))}
          />
        </View>
      </View>
      <Campo rotulo="Profissional (opcional)" value={profissional} onChangeText={setProfissional} />
      <Campo rotulo="Local (opcional)" value={local} onChangeText={setLocal} />
      <View style={estilos.linha}>
        <View style={{ flex: 3 }}>
          <Campo
            rotulo="Retorno (opcional)"
            placeholder="10/01/2027"
            keyboardType="number-pad"
            maxLength={10}
            value={retornoData}
            onChangeText={(texto) => setRetornoData(mascararData(texto))}
          />
        </View>
        <View style={{ flex: 2 }}>
          <Campo
            rotulo="Hora do retorno"
            placeholder={hora || '14:30'}
            keyboardType="number-pad"
            maxLength={5}
            value={retornoHora}
            onChangeText={(texto) => setRetornoHora(mascararHora(texto))}
          />
        </View>
      </View>

      <SeletorDeAviso dataHora={dataHora} valor={aviso} aoMudar={setAviso} />

      <Erro>{erro}</Erro>
      <Botao titulo="Salvar" onPress={aoSalvar} ocupado={ocupado} />
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  tela: { padding: 20, gap: 14 },
  linha: { flexDirection: 'row', gap: 10 },
});
