import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../compartilhado/adaptadores/prisma.service';
import { Publico } from './guarda-de-sessao';

@Controller('saude')
export class SaudeController {
  constructor(private readonly prisma: PrismaService) {}

  @Publico()
  @Get()
  async verificar(): Promise<{ status: string; banco: string }> {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: 'ok', banco: 'ok' };
  }
}
