import { Type } from 'class-transformer';
import { IsDate, IsNotEmpty, IsNumber, IsString, MaxLength } from 'class-validator';

export class RecordIndicatorDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  type!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  value!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  unit!: string;

  @Type(() => Date)
  @IsDate()
  measuredAt!: Date;
}
