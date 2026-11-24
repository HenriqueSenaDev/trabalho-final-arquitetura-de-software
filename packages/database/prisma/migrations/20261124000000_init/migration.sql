-- CreateEnum
CREATE TYPE "estado_agendamento" AS ENUM ('PENDENTE', 'ENVIADO', 'CANCELADO', 'FALHOU');

-- CreateTable
CREATE TABLE "titulares" (
    "id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha_hash" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "titulares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessoes" (
    "id" UUID NOT NULL,
    "titular_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "dispositivo" TEXT NOT NULL,
    "token_entrega" TEXT,
    "criada_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revogada_em" TIMESTAMP(3),

    CONSTRAINT "sessoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultas" (
    "id" UUID NOT NULL,
    "titular_id" UUID NOT NULL,
    "data_hora" TIMESTAMP(3) NOT NULL,
    "especialidade" TEXT NOT NULL,
    "profissional" TEXT,
    "local" TEXT,
    "motivo" TEXT,
    "anotacoes" TEXT,
    "retorno_em" TIMESTAMP(3),
    "registrada_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consultas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agendamentos" (
    "id" UUID NOT NULL,
    "titular_id" UUID NOT NULL,
    "origem_tipo" TEXT NOT NULL,
    "origem_id" UUID NOT NULL,
    "instante" TIMESTAMP(3) NOT NULL,
    "estado" "estado_agendamento" NOT NULL DEFAULT 'PENDENTE',
    "versao" INTEGER NOT NULL DEFAULT 1,
    "tentativas" INTEGER NOT NULL DEFAULT 0,
    "reservado_ate" TIMESTAMP(3),
    "ultimo_erro" TEXT,
    "enviado_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agendamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auditoria" (
    "id" UUID NOT NULL,
    "identidade" UUID,
    "acao" TEXT NOT NULL,
    "resultado" TEXT NOT NULL,
    "referencia" TEXT,
    "instante" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "titulares_email_key" ON "titulares"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessoes_token_hash_key" ON "sessoes"("token_hash");

-- CreateIndex
CREATE INDEX "sessoes_titular_id_idx" ON "sessoes"("titular_id");

-- CreateIndex
CREATE INDEX "consultas_titular_id_data_hora_id_idx" ON "consultas"("titular_id", "data_hora", "id");

-- CreateIndex
CREATE INDEX "agendamentos_estado_instante_idx" ON "agendamentos"("estado", "instante");

-- CreateIndex
CREATE UNIQUE INDEX "agendamentos_origem_tipo_origem_id_key" ON "agendamentos"("origem_tipo", "origem_id");

-- CreateIndex
CREATE INDEX "auditoria_identidade_instante_idx" ON "auditoria"("identidade", "instante");

-- AddForeignKey
ALTER TABLE "sessoes" ADD CONSTRAINT "sessoes_titular_id_fkey" FOREIGN KEY ("titular_id") REFERENCES "titulares"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Contrato de leitura publicado pelo módulo Acesso à Conta para o
-- Processador de lembretes: destinos de notificação das sessões ativas.
-- Sessão revogada deixa de aparecer aqui, então o aparelho perdido para de
-- receber avisos (ADR 04). O Prisma não gerencia views; ela vive só na migration.
CREATE VIEW "destinos_notificacao" AS
SELECT "titular_id", "token_entrega"
FROM "sessoes"
WHERE "revogada_em" IS NULL AND "token_entrega" IS NOT NULL;
