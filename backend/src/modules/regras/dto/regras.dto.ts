import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { MES_REGEX, TIPOS_REGRA, type TipoRegra } from '@shared/dominio';

export class CriarRegraDto {
  @IsString()
  @IsNotEmpty({ message: 'Dê um nome à regra.' })
  @MaxLength(60)
  nome!: string;

  @IsIn(TIPOS_REGRA as unknown as string[])
  tipo!: TipoRegra;

  @ValidateIf((o: CriarRegraDto) => o.tipo === 'medidor')
  @IsString()
  @IsNotEmpty({ message: 'Informe a unidade medida (km, dias, litros…).' })
  @MaxLength(20)
  unidade?: string;
}

export class ItemPesoDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  percentual!: number;
}

export class DefinirPesosDto {
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ItemPesoDto)
  pesos!: ItemPesoDto[];
}

export class ItemMedicaoDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(9_999_999)
  valor!: number;
}

export class DefinirMedicoesDto {
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ItemMedicaoDto)
  medicoes!: ItemMedicaoDto[];
}

export class MesRegraQuery {
  @IsOptional()
  @Matches(MES_REGEX, { message: 'Informe o mês no formato AAAA-MM.' })
  mes?: string;
}
