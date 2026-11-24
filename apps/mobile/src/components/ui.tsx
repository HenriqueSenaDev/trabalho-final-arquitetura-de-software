import { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';

import { colors } from '@/constants/colors';

export function Campo({ rotulo, ...props }: TextInputProps & { rotulo: string }) {
  return (
    <View style={estilos.campo}>
      <Text style={estilos.rotulo}>{rotulo}</Text>
      <TextInput placeholderTextColor={colors.muted} style={estilos.entrada} {...props} />
    </View>
  );
}

export function Botao({
  titulo,
  onPress,
  ocupado = false,
  secundario = false,
  destrutivo = false,
}: {
  titulo: string;
  onPress: () => void;
  ocupado?: boolean;
  secundario?: boolean;
  /** Ações que apagam ou cancelam algo. */
  destrutivo?: boolean;
}) {
  const corDoTexto = destrutivo ? colors.danger : secundario ? colors.brand : '#FFFFFF';
  return (
    <Pressable
      accessibilityRole="button"
      disabled={ocupado}
      onPress={onPress}
      style={({ pressed }) => [
        estilos.botao,
        (secundario || destrutivo) && estilos.botaoSecundario,
        destrutivo && { borderColor: colors.danger },
        (pressed || ocupado) && { opacity: 0.7 },
      ]}
    >
      {ocupado ? (
        <ActivityIndicator color={corDoTexto} />
      ) : (
        <Text style={[estilos.textoDoBotao, { color: corDoTexto }]}>{titulo}</Text>
      )}
    </Pressable>
  );
}

export function Erro({ children }: { children: ReactNode }) {
  return children ? <Text style={estilos.erro}>{children}</Text> : null;
}

const estilos = StyleSheet.create({
  campo: { gap: 6 },
  rotulo: { fontSize: 14, fontWeight: '600', color: colors.text },
  entrada: {
    borderWidth: 1,
    borderColor: '#D3DAE1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.card,
  },
  botao: {
    backgroundColor: colors.brand,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  botaoSecundario: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.brand,
  },
  textoDoBotao: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  erro: { color: colors.danger, fontSize: 14 },
});
