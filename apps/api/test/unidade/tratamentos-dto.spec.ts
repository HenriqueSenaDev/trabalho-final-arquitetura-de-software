import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { HTTP_CODE_METADATA } from '@nestjs/common/constants';
import { ExamesController } from '../../src/modulos/historico/adaptadores/entrada/exames.controller';
import { AnexosController } from '../../src/modulos/historico/adaptadores/entrada/anexos.controller';
import { TratamentosController } from '../../src/modulos/historico/adaptadores/entrada/tratamentos.controller';
import { SalvarTratamentoDto } from '../../src/modulos/historico/adaptadores/entrada/salvar-tratamento.dto';

const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});

const metadata = {
  type: 'body' as const,
  metatype: SalvarTratamentoDto,
  data: undefined,
};

const baseTratamento = {
  medicamento: 'Medicamento',
  dose: '1 comprimido',
  formaAdministracao: 'oral',
  frequencia: { tipo: 'FIXA', intervaloHoras: 8 },
  dataInicio: '2026-11-24T08:00:00.000Z',
  horarioInicial: '08:00',
};

describe('DTO HTTP de Tratamentos', () => {
  it('aceita frequência fixa apenas com intervalo positivo e horário HH:mm', async () => {
    await expect(pipe.transform(baseTratamento, metadata)).resolves.toBeInstanceOf(
      SalvarTratamentoDto,
    );
    await expect(
      pipe.transform({ ...baseTratamento, horarioInicial: '8:00' }, metadata),
    ).rejects.toThrow(BadRequestException);
    await expect(
      pipe.transform({ ...baseTratamento, frequencia: { tipo: 'FIXA' } }, metadata),
    ).rejects.toThrow(BadRequestException);
  });

  it('não aceita intervalo nem horário em frequência sob demanda', async () => {
    const sobDemanda = {
      ...baseTratamento,
      frequencia: { tipo: 'SOB_DEMANDA' },
    };
    delete (sobDemanda as { horarioInicial?: string }).horarioInicial;
    await expect(pipe.transform(sobDemanda, metadata)).resolves.toBeInstanceOf(
      SalvarTratamentoDto,
    );
    await expect(
      pipe.transform(
        { ...sobDemanda, frequencia: { tipo: 'SOB_DEMANDA', intervaloHoras: 4 } },
        metadata,
      ),
    ).rejects.toThrow(BadRequestException);
    await expect(
      pipe.transform({ ...sobDemanda, horarioInicial: '08:00' }, metadata),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejeita titularId e demais propriedades não declaradas no body', async () => {
    await expect(
      pipe.transform({ ...baseTratamento, titularId: 'nao-vem-do-cliente' }, metadata),
    ).rejects.toThrow(BadRequestException);
  });
});

describe('Status HTTP dos controllers secundários', () => {
  it('declara 201 para criação, 200 para alteração/encerramento e 204 para exclusão', () => {
    const status = (handler: Function) => Reflect.getMetadata(HTTP_CODE_METADATA, handler);

    expect(status(ExamesController.prototype.registrar)).toBe(201);
    expect(status(AnexosController.prototype.adicionar)).toBe(201);
    expect(status(TratamentosController.prototype.registrar)).toBe(201);
    expect(status(ExamesController.prototype.alterar)).toBe(200);
    expect(status(TratamentosController.prototype.alterar)).toBe(200);
    expect(status(TratamentosController.prototype.encerrar)).toBe(200);
    expect(status(ExamesController.prototype.excluir)).toBe(204);
    expect(status(AnexosController.prototype.remover)).toBe(204);
  });
});
