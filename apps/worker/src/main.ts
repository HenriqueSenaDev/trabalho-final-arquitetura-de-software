/**
 * Processador de lembretes (contêiner separado da API, ADR 01 e 03).
 * Este arquivo é só a composição: escolhe os adaptadores e roda o laço.
 */
import { PrismaClient } from '@personal-health/database';
import { PrismaAgendamentos } from './adaptadores/prisma-agendamentos';
import {
  OutboxDeTratamentosIndisponivel,
  OcorrenciasDeTratamentoIndisponiveis,
} from './adaptadores/estrutura-eventos';
import { AgendaDeDoses } from './dominio/agenda-de-doses';
import { RevisarOcorrencias } from './aplicacao/revisar-ocorrencias';
import {
  DespachanteEventos,
  ProcessarEventosPendentes,
} from './aplicacao/processar-eventos-pendentes';
import { PrismaDestinos } from './adaptadores/prisma-destinos';
import { PrismaRelayOutbox } from './adaptadores/prisma-relay-outbox';
import { ProvedorConsole } from './adaptadores/provedor-console';
import { ProvedorHttp } from './adaptadores/provedor-http';
import { registroJson } from './adaptadores/registro-json';
import { EntregarAvisosDevidos } from './aplicacao/entregar-avisos-devidos';
import { Configuracao, lerConfiguracao } from './configuracao';
import { ProvedorDeNotificacoes } from './portas/provedor-de-notificacoes';

function criarProvedor(configuracao: Configuracao): ProvedorDeNotificacoes {
  switch (configuracao.provedor) {
    case 'console':
      return new ProvedorConsole(registroJson);
    case 'http':
      return new ProvedorHttp(
        configuracao.provedorUrl,
        configuracao.provedorToken,
        configuracao.provedorTempoLimiteSegundos,
      );
    default:
      throw new Error(`Provedor de notificações desconhecido: ${configuracao.provedor}`);
  }
}

const esperar = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function principal(): Promise<void> {
  const configuracao = lerConfiguracao();
  const prisma = new PrismaClient();
  await prisma.$connect();

  const entregarAvisos = new EntregarAvisosDevidos(
    new PrismaAgendamentos(prisma),
    new PrismaDestinos(prisma),
    criarProvedor(configuracao),
    configuracao,
    registroJson,
  );
  const relay = new PrismaRelayOutbox(prisma);

  const revisar = new RevisarOcorrencias(
    new AgendaDeDoses(),
    new OcorrenciasDeTratamentoIndisponiveis(),
    new PrismaAgendamentos(prisma),
  );
  const processarTratamentos = new ProcessarEventosPendentes(
    new OutboxDeTratamentosIndisponivel(),
    new DespachanteEventos({
      TreatmentChanged: {
        executar: async (evento) => {
          if (evento.tipo !== 'TreatmentChanged') throw new Error('Tipo de evento inválido.');
          await revisar.executar({ ...evento, tipo: 'TreatmentChanged' });
        },
      },
    }),
  );

  void processarTratamentos;

  let ativo = true;
  const parar = (sinal: string) => {
    if (!ativo) return;
    registroJson.info('Encerrando o processador de lembretes', { sinal });
    ativo = false;
  };
  process.on('SIGINT', () => parar('SIGINT'));
  process.on('SIGTERM', () => parar('SIGTERM'));

  registroJson.info('Processador de lembretes iniciado', {
    provedor: configuracao.provedor,
    intervaloMs: configuracao.intervaloMs,
  });

  while (ativo) {
    try {
      await relay.executar(configuracao.lote);
    } catch (erro) {
      registroJson.erro('Falha no consumo da outbox', { erro: String(erro) });
    }

    try {
      const reservados = await entregarAvisos.executarCiclo();
      // Lote cheio indica fila acumulada: segue drenando sem esperar.
      if (reservados < configuracao.lote) {
        await esperar(configuracao.intervaloMs);
      }
    } catch (erro) {
      registroJson.erro('Falha no ciclo do processador', { erro: String(erro) });
      await esperar(configuracao.intervaloMs);
    }
  }

  await prisma.$disconnect();
}

void principal();
