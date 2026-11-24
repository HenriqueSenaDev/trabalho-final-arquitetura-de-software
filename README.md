# PersonalHealth

Plataforma para o titular registrar e consultar o próprio histórico de saúde: conta, registros (consultas, exames, vacinas), anexos de exames, indicadores e lembretes.

## Requisitos

* Node.js 20+
* pnpm
* Docker
* `pg_dump` e `pg_restore` (cliente PostgreSQL 17) para o backup

## Arquitetura (C4 nível 2)

```text
Titular ──► Aplicativo cliente ──HTTPS──► API de Saúde ──► Banco relacional ◄── Processador de eventos ──► Provedor de notificações
                                              │                 ▲                  e lembretes
                                              ▼                 │
                                   Armazenamento de anexos ◄── Backup e restauração ──► Repositório de backup
```

Cada contêiner do diagrama corresponde a um pacote do workspace:

| Contêiner C4                         | Pacote                        | Tecnologia                         |
| ------------------------------------ | ----------------------------- | ---------------------------------- |
| Aplicativo cliente                   | `apps/mobile`                 | Expo (React Native)                |
| API de Saúde                         | `apps/api`                    | NestJS, Clean Architecture         |
| Processador de eventos e lembretes   | `apps/worker`                 | Node.js                            |
| Backup e restauração                 | `apps/backup`                 | Node.js (CLI)                      |
| Banco relacional                     | `packages/database`           | PostgreSQL 17 + Prisma             |
| Armazenamento de anexos              | serviço `attachments-storage` | MinIO (S3), bucket privado         |
| Repositório de backup                | serviço `backup-repository`   | MinIO isolado, cópias cifradas     |
| Provedor de notificações             | externo                       | adapter `console` ou `http`        |

`packages/contracts` guarda o contrato dos eventos trocados entre a API e o processador.

### API de Saúde

Organizada em Clean Architecture, um módulo por contexto (`accounts`, `health-records`, `indicators`, `reminders`), cada um com as mesmas camadas:

```text
src/modules/<contexto>/
├── domain/          # entidades, regras e portas de repositório (sem framework)
├── application/     # casos de uso e portas de serviços externos
├── infrastructure/  # adapters: Prisma, S3, hash de senha
└── presentation/    # controllers HTTP e DTOs
```

As dependências apontam sempre para dentro: `presentation → application → domain`, e `infrastructure` implementa as portas declaradas em `domain`/`application`. Os casos de uso são classes puras montadas no módulo Nest por `useFactory`.

### Eventos e lembretes (outbox transacional)

1. A API grava a escrita de negócio e o evento em `outbox_events` **na mesma transação**.
2. O processador lê o outbox com `FOR UPDATE SKIP LOCKED` (pode rodar em várias réplicas), executa o handler e marca o evento como processado; falhas são retentadas até `OUTBOX_MAX_ATTEMPTS`.
3. `reminder.scheduled` reserva um aviso em `notification_deliveries`; `reminder.cancelled` cancela os avisos reservados.
4. Quando o horário chega, o processador solicita o aviso ao provedor de notificações e marca o lembrete como concluído.

### Backup e restauração

Cada ponto de recuperação contém o dump do banco e a cópia dos anexos, cifrados com AES-256-GCM antes de sair para o repositório de backup, além de um manifesto com checksums. A restauração decifra e confere todos os checksums antes de tocar no ambiente.

## Estrutura do workspace

```text
apps/
├── api/        # API de Saúde
├── worker/     # Processador de eventos e lembretes
├── backup/     # Backup e restauração
└── mobile/     # Aplicativo cliente
packages/
├── database/   # Schema Prisma, migrations e client compartilhado
└── contracts/  # Contrato dos eventos do outbox
```

## Setup

### 1. Instalar dependências

```bash
pnpm install
```

O `postinstall` gera o Prisma Client e compila os pacotes compartilhados.

### 2. Configurar variáveis de ambiente

```bash
cp .env.example .env
cp apps/mobile/.env.example apps/mobile/.env
```

O `.env` da raiz é lido pela API, pelo processador e pelo backup. Para o backup, gere a chave de cifra com `openssl rand -base64 32` e preencha `BACKUP_ENCRYPTION_KEY`. O `.env` do mobile guarda `EXPO_PUBLIC_BASE_URL`, o endereço da API visto pelo dispositivo ou emulador.

### 3. Subir os serviços locais

```bash
docker compose up -d
```

- **PostgreSQL**: `localhost:5432`
- **Armazenamento de anexos (MinIO)**: API em `http://localhost:9000`, console em `http://localhost:9001` (`minioadmin` / `minioadmin`)
- **Repositório de backup (MinIO isolado)**: API em `http://localhost:9100`, console em `http://localhost:9101` (`backupadmin` / `backupadmin`)

### 4. Aplicar as migrations

```bash
pnpm db:deploy
```

### 5. Rodar

```bash
pnpm dev:api      # API de Saúde em http://localhost:3000
pnpm dev:worker   # Processador de eventos e lembretes
pnpm dev:mobile   # Aplicativo cliente (Expo)
```

## Comandos úteis

### Banco de dados

```bash
pnpm db:generate  # gera os tipos do Prisma após mudar o schema
pnpm db:migrate   # cria uma migration nova após mudar o schema
pnpm db:deploy    # aplica as migrations pendentes
pnpm db:reset     # recria o banco
pnpm db:studio    # abre o Prisma Studio
```

### Backup

```bash
pnpm backup:run                 # cria um ponto de recuperação
pnpm -F backup list             # lista os pontos disponíveis
pnpm backup:restore <id>        # restaura banco e anexos
```

### Qualidade

```bash
pnpm build      # compila todos os pacotes
pnpm typecheck  # checagem de tipos
pnpm test       # testes
```

## Endpoints da API

| Método | Rota                                                                 | Descrição                         |
| ------ | -------------------------------------------------------------------- | --------------------------------- |
| GET    | `/health`                                                            | Saúde da API e do banco           |
| POST   | `/holders`                                                           | Cadastra titular                  |
| GET    | `/holders/:holderId`                                                 | Consulta titular                  |
| POST   | `/holders/:holderId/records`                                         | Cria registro no histórico        |
| GET    | `/holders/:holderId/records`                                         | Lista o histórico                 |
| POST   | `/holders/:holderId/records/:recordId/attachments`                   | Gera URL assinada para upload     |
| GET    | `/holders/:holderId/records/:recordId/attachments/:id/download`      | Gera URL assinada para download   |
| POST   | `/holders/:holderId/indicators`                                      | Registra medição de indicador     |
| GET    | `/holders/:holderId/indicators?type=`                                | Lista medições                    |
| POST   | `/holders/:holderId/reminders`                                       | Agenda lembrete                   |
| GET    | `/holders/:holderId/reminders`                                       | Lista lembretes                   |
| PATCH  | `/holders/:holderId/reminders/:reminderId/cancel`                    | Cancela lembrete                  |
