import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { request } from './http-client';
import { SessaoDoAplicativo } from './sessao';

export type TipoDeItem = 'CONSULTA' | 'RETORNO';

export interface ItemDaLinhaDoTempo {
  tipo: TipoDeItem;
  id: string;
  data: string;
  titulo: string;
  detalhe: string | null;
}

export interface PaginaLinhaDoTempo {
  proximos: ItemDaLinhaDoTempo[];
  passados: { mes: string; itens: ItemDaLinhaDoTempo[] }[];
  cursor: string | null;
}

export type Lembrete = { antecedenciaMinutos: number };

export interface NovaConsulta {
  /** Gerado no aparelho: repetir o envio não duplica a consulta. */
  id: string;
  dataHora: string;
  especialidade: string;
  profissional?: string;
  local?: string;
  retornoEm?: string;
  lembrete?: Lembrete;
}

/** Campo ausente fica como está; `lembrete: null` cancela o aviso. */
export interface AlteracaoDeConsulta {
  dataHora?: string;
  lembrete?: Lembrete | null;
}

export interface AvisoDaConsulta {
  instante: string;
  estado: 'PENDENTE' | 'ENVIADO' | 'CANCELADO' | 'FALHOU';
  versao: number;
}

export interface DetalheDaConsulta {
  id: string;
  dataHora: string;
  especialidade: string;
  profissional: string | null;
  local: string | null;
  motivo: string | null;
  anotacoes: string | null;
  retornoEm: string | null;
  registradaEm: string;
  aviso: AvisoDaConsulta | null;
}

export interface ResultadoDaConsulta {
  id: string;
  avisoAgendadoPara: string | null;
}

/**
 * Na prova de conceito o token de entrega é o identificador desta execução
 * do app. Com expo-notifications ele passa a ser o push token do aparelho,
 * sem mudança na API.
 */
const tokenDeEntrega = `dev-${Platform.OS}-${Constants.sessionId}`;

export function entrar(email: string, senha: string): Promise<SessaoDoAplicativo> {
  return request('/sessoes', {
    metodo: 'POST',
    corpo: { email, senha, dispositivo: Platform.OS, tokenEntrega: tokenDeEntrega },
  });
}

/** Revoga a sessão no servidor: o token deixa de valer e o aparelho para de receber avisos. */
export function sair(atual: SessaoDoAplicativo): Promise<void> {
  return request(`/sessoes/${atual.sessaoId}`, { metodo: 'DELETE', token: atual.token });
}

export function registrarConsulta(token: string, consulta: NovaConsulta): Promise<ResultadoDaConsulta> {
  return request('/consultas', { metodo: 'POST', corpo: consulta, token });
}

export function detalharConsulta(token: string, id: string): Promise<DetalheDaConsulta> {
  return request(`/consultas/${id}`, { token });
}

export function alterarConsulta(
  token: string,
  id: string,
  alteracao: AlteracaoDeConsulta,
): Promise<ResultadoDaConsulta> {
  return request(`/consultas/${id}`, { metodo: 'PATCH', corpo: alteracao, token });
}

export function excluirConsulta(token: string, id: string): Promise<void> {
  return request(`/consultas/${id}`, { metodo: 'DELETE', token });
}

export function carregarLinhaDoTempo(token: string, cursor?: string): Promise<PaginaLinhaDoTempo> {
  const fuso = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const parametros = new URLSearchParams({ fuso });
  if (cursor) parametros.set('cursor', cursor);
  return request(`/linha-do-tempo?${parametros.toString()}`, { token });
}
