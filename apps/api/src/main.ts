import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function iniciar(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.enableShutdownHooks();

  const porta = process.env.PORT ?? 3000;
  await app.listen(porta, '0.0.0.0');
  console.log(`API de Saúde em http://localhost:${porta}`);
}

void iniciar();
