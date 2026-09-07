import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { TIPOS_ENTRADA, type TipoEntrada } from '@shared/dominio';

export class CriarEntradaDto {
  @IsIn(TIPOS_ENTRADA as unknown as string[])
  tipo!: TipoEntrada;

  @IsString()
  @IsNotEmpty({ message: 'Descreva a entrada.' })
  @MaxLength(120)
  descricao!: string;

  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Informe um valor válido.' })
  @IsPositive({ message: 'O valor precisa ser maior que zero.' })
  @Max(99_999_999)
  valor!: number;

  @ValidateIf((o: CriarEntradaDto) => o.tipo === 'recorrente')
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(31)
  diaDoMes?: number;

  @ValidateIf((o: CriarEntradaDto) => o.tipo === 'pontual')
  @IsISO8601({ strict: true }, { message: 'Informe a data no formato AAAA-MM-DD.' })
  data?: string;
}

export class AtualizarEntradaDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  descricao?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(99_999_999)
  valor?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(31)
  diaDoMes?: number;

  @IsOptional()
  @IsISO8601({ strict: true })
  data?: string;
}
