import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Botao, Campo, Erro } from '@/components/ui';
import { colors } from '@/constants/colors';
import { entrar } from '@/lib/api';
import { ApiError } from '@/lib/http-client';
import { sessao } from '@/lib/sessao';

/** Passo 1 do fluxo: o titular entra; a API devolve o token da sessão. */
export default function EntrarScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('ana@personalhealth.dev');
  const [senha, setSenha] = useState('senha-da-ana');
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');

  async function aoEntrar() {
    setOcupado(true);
    setErro('');
    try {
      sessao.iniciar(await entrar(email.trim(), senha));
      router.replace('/linha-do-tempo');
    } catch (falha) {
      setErro(falha instanceof ApiError ? falha.message : 'Falha inesperada.');
    } finally {
      setOcupado(false);
    }
  }

  return (
    <View style={estilos.tela}>
      <Text style={estilos.titulo}>PersonalHealth</Text>
      <Text style={estilos.subtitulo}>Seu histórico de saúde em um só lugar.</Text>
      <Campo
        rotulo="E-mail"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <Campo rotulo="Senha" value={senha} onChangeText={setSenha} secureTextEntry />
      <Erro>{erro}</Erro>
      <Botao titulo="Entrar" onPress={aoEntrar} ocupado={ocupado} />
    </View>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, padding: 24, gap: 14, justifyContent: 'center' },
  titulo: { fontSize: 28, fontWeight: '700', color: colors.text },
  subtitulo: { fontSize: 16, color: colors.muted, marginBottom: 12 },
});
