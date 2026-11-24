/**
 * Processador de lembretes (contêiner separado da API, ADR 01 e 03).
 * Este arquivo é só a composição: escolhe os adaptadores e roda o laço.
 */
import { PrismaClient } from '@personal-health/database';
import { PrismaAgendamentos } from './adaptadores/prisma-agendamentos';
import { PrismaDestinos } from './adaptadores/prisma-destinos';
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
