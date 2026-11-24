/**
 * Cria os titulares de demonstração. O cadastro de conta não faz parte do
 * fluxo principal, então a conta já existe quando o fluxo começa.
 *
 *   pnpm db:seed
 */
import { PrismaClient } from '@personal-health/database';
import { gerarHashDeSenha } from '../src/modulos/acesso-conta/adaptadores/saida/scrypt';

export const TITULARES_DE_DEMONSTRACAO = [
  {
    id: '0b6f6c1e-6b1a-4c43-9a51-6f1f0d7a0001',
    nome: 'Ana Souza',
    email: 'ana@personalhealth.dev',
    senha: 'senha-da-ana',
  },
  {
    id: '0b6f6c1e-6b1a-4c43-9a51-6f1f0d7a0002',
    nome: 'Bruno Lima',
    email: 'bruno@personalhealth.dev',
    senha: 'senha-do-bruno',
  },
];

async function semear(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    for (const { senha, ...titular } of TITULARES_DE_DEMONSTRACAO) {
      const senhaHash = await gerarHashDeSenha(senha);
      await prisma.titular.upsert({
        where: { email: titular.email },
        create: { ...titular, senhaHash },
        update: { nome: titular.nome, senhaHash },
      });
      console.log(`Titular pronto: ${titular.email} / ${senha}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  semear().catch((erro: unknown) => {
    console.error(erro);
    process.exitCode = 1;
  });
}
