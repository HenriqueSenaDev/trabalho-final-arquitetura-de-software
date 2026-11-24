import { Type } from 'class-transformer';
import {
  IsDate,
  IsIn,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';
import { RegraVioladaErro } from '../../../../compartilhado/dominio/erros';
import {
  ContextoGlicemia,
  Glicemia,
  Peso,
  PressaoArterial,
  TipoMedicao,
  ValorMedicao,
} from '../../dominio/medicao';

export class AlterarMedicaoDto {
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dataHora?: Date;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  valor?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  sistolica?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  diastolica?: number;

  @IsOptional()
  @IsIn(['JEJUM', 'POS_REFEICAO'])
  contexto?: ContextoGlicemia;

  converterParaValorMedicao(tipo: TipoMedicao): ValorMedicao | undefined {
    if (this.valor === undefined && this.sistolica === undefined && this.diastolica === undefined) {
      return undefined;
    }

    switch (tipo) {
      case 'PESO':
        if (this.valor === undefined) {
          throw new RegraVioladaErro('Informe o valor do peso em kg.');
        }
        return new Peso(this.valor);
      case 'PRESSAO_ARTERIAL':
        if (this.sistolica === undefined || this.diastolica === undefined) {
          throw new RegraVioladaErro('Informe sistólica e diastólica para pressão arterial.');
        }
        return new PressaoArterial(this.sistolica, this.diastolica);
      case 'GLICEMIA':
        if (this.valor === undefined || !this.contexto) {
          throw new RegraVioladaErro('Informe o valor e o contexto (JEJUM ou POS_REFEICAO) da glicemia.');
        }
        return new Glicemia(this.valor, this.contexto);
    }
  }
}
