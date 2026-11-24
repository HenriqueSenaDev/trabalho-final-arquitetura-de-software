import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // Validação, erros, sessão e auditoria: registrados em infrastructure/http/http.module.ts.

  app.enableCors();
  app.enableShutdownHooks();

  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`API de Saúde em http://localhost:${port}`);
}

void bootstrap();
