import { loadConfig } from './config';
import { createSnapshot, listSnapshots, restoreSnapshot } from './snapshot';

const USAGE = `Uso:
  backup            cria um ponto de recuperação (banco + anexos) cifrado
  list              lista os pontos de recuperação disponíveis
  restore <id>      restaura o banco e os anexos a partir de um ponto`;

async function main(): Promise<void> {
  const [command, ...args] = process.argv.slice(2).filter((arg) => arg !== '--');
  switch (command) {
    case 'backup': {
      const manifest = await createSnapshot(loadConfig());
      console.log(
        `Ponto de recuperação ${manifest.id} criado: banco (${manifest.database.bytes} bytes) e ${manifest.attachments.length} anexo(s).`,
      );
      break;
    }
    case 'list': {
      const ids = await listSnapshots(loadConfig());
      console.log(ids.length ? ids.join('\n') : 'Nenhum ponto de recuperação encontrado.');
      break;
    }
    case 'restore': {
      const [id] = args;
      if (!id) {
        throw new Error(`Informe o id do ponto de recuperação.\n\n${USAGE}`);
      }
      const manifest = await restoreSnapshot(loadConfig(), id);
      console.log(
        `Ponto ${manifest.id} restaurado: banco e ${manifest.attachments.length} anexo(s).`,
      );
      break;
    }
    default:
      console.log(USAGE);
      process.exitCode = command ? 1 : 0;
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
