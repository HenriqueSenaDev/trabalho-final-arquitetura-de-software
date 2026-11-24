import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Auditar } from '../../../../entrada-http/auditoria.interceptor';
import { TitularAutenticado } from '../../../../entrada-http/guarda-de-sessao';
import { AdicionarAnexo } from '../../aplicacao/adicionar-anexo';
import { RecuperarAnexo } from '../../aplicacao/recuperar-anexo';
import { RemoverAnexo } from '../../aplicacao/remover-anexo';
import { TAMANHO_MAXIMO_ANEXO_BYTES } from '../../portas/validador-arquivo';

interface ArquivoRecebido {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Uint8Array;
}

@Controller('exames/:exameId/anexos')
export class AnexosController {
  constructor(
    private readonly adicionarAnexo: AdicionarAnexo,
    private readonly recuperarAnexo: RecuperarAnexo,
    private readonly removerAnexo: RemoverAnexo,
  ) {}

  @Auditar('anexo.adicionar')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('arquivo', { limits: { fileSize: TAMANHO_MAXIMO_ANEXO_BYTES } }),
  )
  adicionar(
    @TitularAutenticado() titularId: string,
    @Param('exameId', ParseUUIDPipe) exameId: string,
    @UploadedFile() arquivo?: ArquivoRecebido,
  ) {
    if (!arquivo) throw new BadRequestException('Envie um arquivo.');
    return this.adicionarAnexo.executar(
      exameId,
      {
        nomeArquivo: arquivo.originalname,
        tipoMime: arquivo.mimetype,
        tamanhoBytes: arquivo.size,
        conteudo: arquivo.buffer,
      },
      titularId,
    );
  }

  @Auditar('anexo.recuperar')
  @Get(':anexoId')
  recuperar(
    @TitularAutenticado() titularId: string,
    @Param('exameId', ParseUUIDPipe) exameId: string,
    @Param('anexoId', ParseUUIDPipe) anexoId: string,
  ) {
    return this.recuperarAnexo.executar(exameId, anexoId, titularId);
  }

  @Auditar('anexo.remover')
  @Delete(':anexoId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remover(
    @TitularAutenticado() titularId: string,
    @Param('exameId', ParseUUIDPipe) exameId: string,
    @Param('anexoId', ParseUUIDPipe) anexoId: string,
  ) {
    return this.removerAnexo.executar(exameId, anexoId, titularId);
  }
}
